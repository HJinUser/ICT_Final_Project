package com.brentversal.property_image.service;

import com.brentversal.common.s3.service.FileService;
import com.brentversal.property.entity.Property;
import com.brentversal.property_image.entity.PropertyImage;
import com.brentversal.property_image.repository.PropertyImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PropertyImageService {

    private final FileService fileService;
    private final PropertyImageRepository propertyImageRepository;

    private static final int MAX_IMAGE_COUNT = 3;

    // 업로드된 파일들을 PropertyImage 리스트로 변환해서 돌려줌
    // 아직 저장은 안 함 — Property를 저장할 때 cascade로 같이 저장된다
    public List<PropertyImage> buildImages(Property property, List<MultipartFile> files) {
        List<PropertyImage> images = new ArrayList<>();
        if (files == null) {
            return images;
        }

        if (files.size() > MAX_IMAGE_COUNT) {
            throw new IllegalArgumentException("사진은 최대 " + MAX_IMAGE_COUNT + "장까지 등록할 수 있습니다.");
        }

        for (int i = 0; i < files.size(); i++) {
            MultipartFile file = files.get(i);
            if (file == null || file.isEmpty()) {
                continue;
            }

            String url = fileService.upload(file);

            PropertyImage image = new PropertyImage();
            image.setProperty(property);
            image.setUrl(url);
            image.setSortOrder(i);
            image.setIsMain(i == 0);

            images.add(image);
        }
        return images;
    }

    // 사진 한 장 삭제. 저장소(S3/로컬)의 실제 파일도 같이 지운다.
    public void delete (Long id) {
        PropertyImage image = propertyImageRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 사진을 찾을 수 없습니다. id=" + id));

        fileService.delete(image.getUrl());
        propertyImageRepository.delete(image);
    }
}
