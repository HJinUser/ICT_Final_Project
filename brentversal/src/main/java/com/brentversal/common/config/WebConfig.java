package com.brentversal.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Value("${file.access-prefix}")
    private String accessPrefix;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 뒤에 슬래시 없으면 붙여줘야 file: 리소스 위치로 정상 인식됨
        String location = uploadDir.endsWith("/") ? uploadDir : uploadDir + "/";

        registry.addResourceHandler(accessPrefix + "/**")
                .addResourceLocations("file:" + location);
    }
}
