package com.brentversal.realestate.client;

import com.brentversal.realestate.dto.MolitApartmentTradeItem;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HexFormat;
import java.util.List;

@Component
public class MolitApartmentTradeClient {

    public static final String SOURCE_NAME = "MOLIT_APARTMENT_TRADE";
    public static final String SOURCE_URL =
            "https://www.data.go.kr/data/15126469/openapi.do";

    private static final int PAGE_SIZE = 100;
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(20);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${public-data.molit.service-key:}")
    private String serviceKey;

    @Value("${public-data.molit.apartment-trade-url}")
    private String endpoint;

    public boolean isConfigured() {
        return serviceKey != null && !serviceKey.isBlank();
    }

    public List<MolitApartmentTradeItem> fetch(
            String regionCode,
            String dealYearMonth
    ) {
        if (!isConfigured()) {
            throw new IllegalStateException(
                    "MOLIT_API_KEY가 설정되지 않아 실거래가를 수집할 수 없습니다."
            );
        }

        try {
            PageResult firstPage = requestPage(regionCode, dealYearMonth, 1);
            List<MolitApartmentTradeItem> items = new ArrayList<>(firstPage.items());

            int totalPages = (int) Math.ceil(
                    firstPage.totalCount() / (double) PAGE_SIZE
            );

            for (int page = 2; page <= totalPages; page++) {
                pauseBetweenRequests();
                items.addAll(
                        requestPage(regionCode, dealYearMonth, page).items()
                );
            }

            return items;
        } catch (IOException exception) {
            throw new IllegalStateException(
                    "국토교통부 실거래가 API 통신에 실패했습니다.",
                    exception
            );
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "국토교통부 실거래가 수집 작업이 중단되었습니다.",
                    exception
            );
        }
    }

    private PageResult requestPage(
            String regionCode,
            String dealYearMonth,
            int page
    ) throws IOException, InterruptedException {
        URI uri = URI.create(
                endpoint
                        + "?serviceKey=" + encode(serviceKey)
                        + "&LAWD_CD=" + encode(regionCode)
                        + "&DEAL_YMD=" + encode(dealYearMonth)
                        + "&pageNo=" + page
                        + "&numOfRows=" + PAGE_SIZE
        );

        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(REQUEST_TIMEOUT)
                .header("Accept", "application/xml")
                .header("User-Agent", "Brentversal/1.0")
                .GET()
                .build();

        HttpResponse<byte[]> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofByteArray()
        );

        if (response.statusCode() != 200) {
            throw new IOException(
                    "실거래가 API가 HTTP " + response.statusCode() + "을 반환했습니다."
            );
        }

        return parsePage(response.body(), regionCode);
    }

    private PageResult parsePage(byte[] responseBody, String regionCode)
            throws IOException {
        try {
            DocumentBuilderFactory factory = secureDocumentBuilderFactory();
            Document document = factory.newDocumentBuilder().parse(
                    new ByteArrayInputStream(responseBody)
            );
            document.getDocumentElement().normalize();

            String resultCode = firstText(document.getDocumentElement(), "resultCode");
            String resultMessage = firstText(document.getDocumentElement(), "resultMsg");

            if (!resultCode.isBlank()
                    && !"000".equals(resultCode)
                    && !"00".equals(resultCode)) {
                throw new IOException(
                        "실거래가 API 오류: " + resultCode + " " + resultMessage
                );
            }

            int totalCount = integerValue(
                    firstText(document.getDocumentElement(), "totalCount"),
                    0
            );

            NodeList itemNodes = document.getElementsByTagName("item");
            List<MolitApartmentTradeItem> items = new ArrayList<>();

            for (int index = 0; index < itemNodes.getLength(); index++) {
                Element item = (Element) itemNodes.item(index);
                MolitApartmentTradeItem parsedItem = parseItem(item, regionCode);
                if (parsedItem != null) {
                    items.add(parsedItem);
                }
            }

            return new PageResult(totalCount, items);
        } catch (ParserConfigurationException | SAXException exception) {
            throw new IOException("실거래가 XML 응답을 해석하지 못했습니다.", exception);
        }
    }

    private MolitApartmentTradeItem parseItem(
            Element item,
            String requestedRegionCode
    ) {
        String regionCode = firstNonBlank(
                firstText(item, "sggCd"),
                requestedRegionCode
        );
        String apartmentName = firstText(item, "aptNm");
        Long dealPrice = longValue(firstText(item, "dealAmount"));
        BigDecimal area = decimalValue(firstText(item, "excluUseAr"));
        LocalDate dealDate = dealDate(item);

        // 시세 계산의 핵심 값이 없는 행은 저장하지 않는다.
        if (apartmentName.isBlank()
                || dealPrice == null
                || area == null
                || dealDate == null) {
            return null;
        }

        String cancellationType = firstText(item, "cdealType");
        String rawData = canonicalItemData(item);

        return new MolitApartmentTradeItem(
                sourceItemId(item, regionCode),
                regionCode,
                firstText(item, "umdNm"),
                apartmentName,
                firstText(item, "jibun"),
                dealPrice,
                area,
                nullableInteger(firstText(item, "floor")),
                nullableInteger(firstText(item, "buildYear")),
                dealDate,
                firstText(item, "dealingGbn"),
                !cancellationType.isBlank(),
                cancellationDate(firstText(item, "cdealDay")),
                rawData
        );
    }

    private LocalDate dealDate(Element item) {
        Integer year = nullableInteger(firstText(item, "dealYear"));
        Integer month = nullableInteger(firstText(item, "dealMonth"));
        Integer day = nullableInteger(firstText(item, "dealDay"));

        if (year == null || month == null || day == null) {
            return null;
        }

        try {
            return LocalDate.of(year, month, day);
        } catch (RuntimeException exception) {
            return null;
        }
    }

    private LocalDate cancellationDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized = value.trim();
        String[] patterns = {"yyyy-MM-dd", "yyyy.MM.dd", "yy.MM.dd"};

        for (String pattern : patterns) {
            try {
                return LocalDate.parse(
                        normalized,
                        DateTimeFormatter.ofPattern(pattern)
                );
            } catch (DateTimeParseException ignored) {
                // 공공 API의 과거/현재 날짜 표기가 달라 다음 형식을 계속 확인한다.
            }
        }

        return null;
    }

    private String sourceItemId(Element item, String regionCode) {
        List<String> identityParts = new ArrayList<>();
        identityParts.add("regionCode=" + regionCode);

        NodeList children = item.getChildNodes();
        for (int index = 0; index < children.getLength(); index++) {
            Node child = children.item(index);
            if (child.getNodeType() != Node.ELEMENT_NODE) {
                continue;
            }

            String fieldName = child.getNodeName();
            // 계약 해제 정보는 이후에 변경될 수 있으므로 거래 식별값에서 제외한다.
            if ("cdealType".equals(fieldName) || "cdealDay".equals(fieldName)) {
                continue;
            }

            identityParts.add(
                    fieldName + "=" + child.getTextContent().trim()
            );
        }

        Collections.sort(identityParts);
        return sha256(String.join("|", identityParts));
    }

    private String canonicalItemData(Element item) {
        List<String> fields = new ArrayList<>();
        NodeList children = item.getChildNodes();

        for (int index = 0; index < children.getLength(); index++) {
            Node child = children.item(index);
            if (child.getNodeType() == Node.ELEMENT_NODE) {
                fields.add(
                        child.getNodeName() + "=" + child.getTextContent().trim()
                );
            }
        }

        Collections.sort(fields);
        return String.join("\n", fields);
    }

    private DocumentBuilderFactory secureDocumentBuilderFactory()
            throws ParserConfigurationException {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature(
                "http://apache.org/xml/features/disallow-doctype-decl",
                true
        );
        factory.setFeature(
                "http://xml.org/sax/features/external-general-entities",
                false
        );
        factory.setFeature(
                "http://xml.org/sax/features/external-parameter-entities",
                false
        );
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        return factory;
    }

    private String firstText(Element parent, String tagName) {
        NodeList nodes = parent.getElementsByTagName(tagName);
        if (nodes.getLength() == 0 || nodes.item(0).getTextContent() == null) {
            return "";
        }
        return nodes.item(0).getTextContent().trim();
    }

    private String firstNonBlank(String first, String fallback) {
        return first == null || first.isBlank() ? fallback : first;
    }

    private Long longValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value.replace(",", "").trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private BigDecimal decimalValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private Integer nullableInteger(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private int integerValue(String value, int defaultValue) {
        Integer parsed = nullableInteger(value);
        return parsed == null ? defaultValue : parsed;
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(
                    digest.digest(value.getBytes(StandardCharsets.UTF_8))
            );
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 알고리즘을 사용할 수 없습니다.", exception);
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private void pauseBetweenRequests() throws InterruptedException {
        Thread.sleep(200);
    }

    private record PageResult(
            int totalCount,
            List<MolitApartmentTradeItem> items
    ) {
    }
}
