package com.smartsejong.api.auth.client;

import com.smartsejong.api.auth.dto.SejongStudentInfo;
import com.smartsejong.api.exception.CustomException;
import com.smartsejong.api.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

import javax.net.ssl.*;
import java.io.IOException;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * 세종대학교 포털 인증 클라이언트 (고전독서 사이트 경유 방식)
 *
 * OkHttp + SSL을 사용하여 세종대 포털에 로그인하고
 * 고전독서 현황 페이지에서 학생 정보를 조회합니다.
 */
@Slf4j
@Component
public class SejongAuthClient {

    private static final String PORTAL_BASE_URL = "https://portal.sejong.ac.kr";
    private static final String LOGIN_URL = PORTAL_BASE_URL + "/jsp/login/login_action.jsp";
    private static final String SSO_URL = "http://classic.sejong.ac.kr/_custom/sejong/sso/sso-return.jsp?returnUrl=https://classic.sejong.ac.kr/classic/index.do";
    private static final String STATUS_URL = "https://classic.sejong.ac.kr/classic/reading/status.do";

    private final OkHttpClient client;

    public SejongAuthClient() {
        this.client = buildUnsafeClient();
    }

    /**
     * 세종대 포털 로그인 및 학생 정보 조회
     *
     * @param studentId 학번
     * @param password 비밀번호
     * @return 학생 정보 (이름, 학과 등)
     */
    public SejongStudentInfo authenticate(String studentId, String password) {
        // 매 요청마다 새로운 클라이언트 생성 (쿠키 초기화)
        OkHttpClient sessionClient = buildUnsafeClient();

        try {
            // 1. 세종대 포털 로그인
            executePortalLogin(sessionClient, studentId, password);

            // 2. SSO 세션 전이
            executeSsoRedirect(sessionClient);

            // 3. 고전독서 현황 페이지에서 학생 정보 파싱
            String html = fetchStatusPageHtml(sessionClient);
            return parseUserInfo(html, studentId);

        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.error("세종대 포털 인증 중 오류 발생: {}", e.getMessage(), e);
            throw new CustomException(ErrorCode.SEJONG_AUTH_FAILED);
        }
    }

    /**
     * 세종대 포털 로그인 수행
     */
    private void executePortalLogin(OkHttpClient client, String id, String pw) throws IOException {
        RequestBody formBody = new FormBody.Builder()
                .add("mainLogin", "N")
                .add("id", id)
                .add("password", pw)
                .build();

        Request request = new Request.Builder()
                .url(LOGIN_URL)
                .post(formBody)
                .header("Referer", PORTAL_BASE_URL)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .build();

        try (Response response = client.newCall(request).execute()) {
            String body = response.body() != null ? response.body().string() : "";
            if (body.contains("fail") || body.contains("불일치") || body.contains("존재하지 않는")) {
                log.warn("세종대 포털 로그인 실패 - 잘못된 자격 증명: {}", id);
                throw new CustomException(ErrorCode.SEJONG_AUTH_FAILED);
            }
        }
    }

    /**
     * SSO 세션 전이 수행
     */
    private void executeSsoRedirect(OkHttpClient client) throws IOException {
        Request request = new Request.Builder()
                .url(SSO_URL)
                .get()
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                log.error("SSO 리다이렉트 실패: {}", response.code());
                throw new CustomException(ErrorCode.SEJONG_AUTH_FAILED);
            }
        }
    }

    /**
     * 고전독서 현황 페이지 HTML 획득
     */
    private String fetchStatusPageHtml(OkHttpClient client) throws IOException {
        Request request = new Request.Builder()
                .url(STATUS_URL)
                .get()
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (response.body() == null || response.code() != 200) {
                log.error("현황 페이지 조회 실패: {}", response.code());
                throw new CustomException(ErrorCode.SEJONG_AUTH_FAILED);
            }
            return response.body().string();
        }
    }

    /**
     * HTML 파싱하여 학생 정보 추출
     */
    private SejongStudentInfo parseUserInfo(String html, String studentId) {
        Document doc = Jsoup.parse(html);
        String selector = ".b-con-box:has(h4:contains(사용자 정보)) table.b-board-table tbody tr";
        List<String> values = new ArrayList<>();

        doc.select(selector).forEach(tr -> values.add(tr.select("td").text().trim()));

        if (values.size() < 5) {
            log.error("파싱 데이터 부족: {} 개", values.size());
            throw new CustomException(ErrorCode.SEJONG_AUTH_FAILED);
        }

        // values: [0] 학과, [1] 학번, [2] 이름, [3] 학년, [4] 상태
        String major = values.get(0);
        String name = values.get(2);
        String grade = values.get(3).replaceAll("[^0-9]", "");

        log.info("세종대 포털 인증 성공 - 학번: {}, 이름: {}, 학과: {}, 학년: {}",
                studentId, name, major, grade);

        return SejongStudentInfo.builder()
                .studentId(studentId)
                .fullName(name)
                .major(major)
                .build();
    }

    /**
     * SSL 인증서 검증을 우회하는 OkHttpClient 생성
     */
    private OkHttpClient buildUnsafeClient() {
        try {
            TrustManager[] trustAllCerts = new TrustManager[]{
                    new X509TrustManager() {
                        @Override
                        public void checkClientTrusted(X509Certificate[] chain, String authType) {}

                        @Override
                        public void checkServerTrusted(X509Certificate[] chain, String authType) {}

                        @Override
                        public X509Certificate[] getAcceptedIssuers() {
                            return new X509Certificate[0];
                        }
                    }
            };

            SSLContext sslContext = SSLContext.getInstance("SSL");
            sslContext.init(null, trustAllCerts, new java.security.SecureRandom());

            CookieManager cookieManager = new CookieManager();
            cookieManager.setCookiePolicy(CookiePolicy.ACCEPT_ALL);

            return new OkHttpClient.Builder()
                    .sslSocketFactory(sslContext.getSocketFactory(), (X509TrustManager) trustAllCerts[0])
                    .hostnameVerifier((hostname, session) -> true)
                    .cookieJar(new JavaNetCookieJar(cookieManager))
                    .connectTimeout(30, TimeUnit.SECONDS)
                    .readTimeout(30, TimeUnit.SECONDS)
                    .writeTimeout(30, TimeUnit.SECONDS)
                    .followRedirects(true)
                    .followSslRedirects(true)
                    .build();

        } catch (Exception e) {
            log.error("OkHttpClient 생성 실패", e);
            throw new RuntimeException("HTTP 클라이언트 생성 실패", e);
        }
    }

    /**
     * Java CookieManager를 OkHttp CookieJar로 연결
     */
    private static class JavaNetCookieJar implements CookieJar {
        private final CookieManager cookieManager;

        JavaNetCookieJar(CookieManager cookieManager) {
            this.cookieManager = cookieManager;
        }

        @Override
        public void saveFromResponse(HttpUrl url, List<Cookie> cookies) {
            for (Cookie cookie : cookies) {
                cookieManager.getCookieStore().add(
                        url.uri(),
                        new java.net.HttpCookie(cookie.name(), cookie.value())
                );
            }
        }

        @Override
        public List<Cookie> loadForRequest(HttpUrl url) {
            List<Cookie> cookies = new ArrayList<>();
            for (java.net.HttpCookie httpCookie : cookieManager.getCookieStore().getCookies()) {
                Cookie cookie = new Cookie.Builder()
                        .domain(url.host())
                        .path("/")
                        .name(httpCookie.getName())
                        .value(httpCookie.getValue())
                        .build();
                cookies.add(cookie);
            }
            return cookies;
        }
    }
}
