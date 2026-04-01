# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartSejong API Service - AI-based timetable curation system for Sejong University. Spring Boot 4.0.1 REST API with Kakao OAuth authentication and Sejong University portal integration.

## Build & Run Commands

```bash
# Build
./gradlew clean build

# Build without tests
./gradlew build -x test

# Run application (default port 8080)
./gradlew bootRun

# Run all tests
./gradlew test

# Run specific test class
./gradlew test --tests SmartSejongApplicationTests

# Run specific test method
./gradlew test --tests "SmartSejongApplicationTests.contextLoads"
```

## Development URLs

- Application: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI docs: `http://localhost:8080/v3/api-docs`
- H2 Console: `http://localhost:8080/h2-console`

## Architecture

**Tech Stack:** Java 17, Spring Boot 4.0.1, Spring Data JPA, Spring Security with OAuth2, WebFlux (for external API calls), Gradle

**Package Structure:** `com.smartsejong.api`
- `controller/` - REST endpoints
- `entity/` - JPA entities with `BaseTimeEntity` for audit timestamps
- `repository/` - Spring Data JPA repositories
- `config/` - Spring configurations (Security, Swagger, WebClient, JPA Auditing)
- `exception/` - `CustomException`, `ErrorCode` enum, `GlobalExceptionHandler`
- `common/` - `CommonResponse<T>` wrapper, shared enums

**Entity Relationships:**
- User → Timetable (1:N)
- User → GroupMember (1:N)
- Course → Section (1:N)
- Timetable → TimetableItem (1:N)
- Section → TimetableItem (1:N)
- Group → GroupMember (1:N)

## Code Conventions

**API Responses:** Always wrap in `CommonResponse.success(data)` or `CommonResponse.success(message, data)`

**Exception Handling:** Use `CustomException` with `ErrorCode` enum. Error codes are domain-prefixed:
- `A0xx` - Authentication
- `L0xx` - Academic/Lectures
- `G0xx` - Groups
- `C0xx` - Common

**Entities:** Extend `BaseTimeEntity` for automatic `createdAt`/`updatedAt`. Use Lombok `@Builder`, `@Getter`, `@NoArgsConstructor(access = PROTECTED)`.

**External APIs:** Use configured WebClient beans:
- `kakaoWebClient` - Kakao API calls
- `sejongPortalWebClient` - Sejong University portal

## Configuration

- `application.properties` - Base configuration
- `application-secret.yml` - Secrets (gitignored) - API keys, DB credentials
- CORS configured for `http://localhost:3000` (React frontend)
- Stateless JWT authentication (CSRF disabled)