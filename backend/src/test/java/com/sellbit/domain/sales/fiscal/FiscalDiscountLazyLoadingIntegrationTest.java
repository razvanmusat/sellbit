package com.sellbit.domain.sales.fiscal;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sellbit.domain.catalog.category.Category;
import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.lookup.paymentmethod.PaymentMethod;
import com.sellbit.domain.lookup.producttype.ProductType;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatus;
import com.sellbit.domain.lookup.unitofmeasure.UnitOfMeasure;
import com.sellbit.domain.lookup.vatrate.VatRate;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receipt.ReceiptRepository;
import com.sellbit.domain.sales.receiptitem.ReceiptItem;
import com.sellbit.domain.sales.receiptpayment.ReceiptPayment;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucher;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucherRepository;
import com.sellbit.domain.voucher.vouchercampaign.CampaignType;
import com.sellbit.domain.voucher.vouchercampaign.VoucherCampaign;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.SSLSession;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.Authenticator;
import java.net.CookieHandler;
import java.net.ProxySelector;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executor;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class FiscalDiscountLazyLoadingIntegrationTest {

    @Autowired private EntityManager entityManager;
    @Autowired private ReceiptRepository receiptRepository;
    @Autowired private TransactionTemplate transactionTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void advancePaymentOnGvMenuBuildsFiscalDiscountAfterDetachedLoad() throws Exception {
        LoadedReceipt loaded = createAndLoadDetached(data -> {
            Product menu = createProduct("Meniu petrecere cu stripsuri de pui", data.menuType(), data);
            addItem(data.receipt(), menu, data.gv(), "3163.00");
            addPayment(data.receipt(), data.advanceMethod(), data.gv(), "200.00");
            addPayment(data.receipt(), data.cardMethod(), data.gv(), "2963.00");
        });
        FakeHttpClient httpClient = new FakeHttpClient();

        FiscalAgentService service = newFiscalAgentService(httpClient, mock(CustomerVoucherRepository.class));
        FiscalAgentService.PrintedResult result = service.printGvBon(loaded.receipt(), jobId -> {});

        List<String> commands = postedCommands(httpClient);
        int menuIndex = indexOfCommandStartingWith(commands, "S,1,______,_,__;Meniu petrecere");

        assertThat(result.slipNumber()).isEqualTo("12");
        assertThat(menuIndex).isNotNegative();
        assertThat(commands.get(menuIndex + 1)).isEqualTo("C,1,______,_,__;3;200.00;;;;");
        assertThat(commands).contains("T,1,______,_,__;1;2963.00;;;;");
    }

    @Test
    void advancePaidByBankTransferOnGvIsFiscalizedAsCard() throws Exception {
        LoadedReceipt loaded = createAndLoadDetached(data -> {
            Product advance = createProduct("Avans petrecere", data.advanceType(), data);
            addItem(data.receipt(), advance, data.gv(), "200.00");
            addPayment(data.receipt(), data.bankTransferMethod(), data.gv(), "200.00");
        });
        FakeHttpClient httpClient = new FakeHttpClient();

        FiscalAgentService service = newFiscalAgentService(httpClient, mock(CustomerVoucherRepository.class));

        assertThat(service.needsFiscalPrint(loaded.receipt())).isTrue();
        service.printGvBon(loaded.receipt(), jobId -> {});

        List<String> commands = postedCommands(httpClient);
        assertThat(commands).contains("T,1,______,_,__;1;200.00;;;;");
        assertThat(commands).noneMatch(command -> command.startsWith("C,1,______,_,__;3;"));
    }

    @Test
    void bankTransferOnRegularGvReceiptIsNotFiscalized() {
        LoadedReceipt loaded = createAndLoadDetached(data -> {
            Product menu = createProduct("Meniu obisnuit", data.menuType(), data);
            addItem(data.receipt(), menu, data.gv(), "200.00");
            addPayment(data.receipt(), data.bankTransferMethod(), data.gv(), "200.00");
        });

        FiscalAgentService service = newFiscalAgentService(
                new FakeHttpClient(), mock(CustomerVoucherRepository.class));

        assertThat(service.needsFiscalPrint(loaded.receipt())).isFalse();
    }

    @Test
    void advancePaidByBankTransferOutsideGvIsNotFiscalized() {
        LoadedReceipt loaded = createAndLoadDetached(data -> {
            Warehouse gp = findOrCreate(Warehouse.class, "GP",
                    () -> Warehouse.builder().code("GP").name("Gestiune petrecere").build());
            Product advance = createProduct("Avans petrecere GP", data.advanceType(), data);
            addItem(data.receipt(), advance, gp, "200.00");
            addPayment(data.receipt(), data.bankTransferMethod(), gp, "200.00");
        });

        FiscalAgentService service = newFiscalAgentService(
                new FakeHttpClient(), mock(CustomerVoucherRepository.class));

        assertThat(service.needsFiscalPrint(loaded.receipt())).isFalse();
    }

    @Test
    void voucherPaymentOnGvApplicableProductBuildsFiscalDiscountAfterDetachedLoad() throws Exception {
        LoadedReceipt loaded = createAndLoadDetached(data -> {
            Product target = createProduct("Produs voucher aplicabil", data.menuType(), data);
            Product other = createProduct("Alt produs GV", data.menuType(), data);
            addItem(data.receipt(), other, data.gv(), "300.00");
            addItem(data.receipt(), target, data.gv(), "700.00");
            addPayment(data.receipt(), data.voucherMethod(), data.gv(), "200.00");
            addPayment(data.receipt(), data.cardMethod(), data.gv(), "800.00");
        });
        FakeHttpClient httpClient = new FakeHttpClient();
        Integer targetProductId = loaded.receipt().getItems().stream()
                .map(ReceiptItem::getProduct)
                .filter(product -> "Produs voucher aplicabil".equals(product.getName()))
                .findFirst()
                .orElseThrow()
                .getId();
        CustomerVoucherRepository voucherRepository = mock(CustomerVoucherRepository.class);
        when(voucherRepository.findByUsedReceiptIdWithCampaign(loaded.receipt().getId()))
                .thenReturn(Optional.of(usedVoucher(targetProductId)));

        FiscalAgentService service = newFiscalAgentService(httpClient, voucherRepository);
        service.printGvBon(loaded.receipt(), jobId -> {});

        List<String> commands = postedCommands(httpClient);
        int otherIndex = indexOfCommandStartingWith(commands, "S,1,______,_,__;Alt produs GV");
        int targetIndex = indexOfCommandStartingWith(commands, "S,1,______,_,__;Produs voucher aplicabil");

        assertThat(otherIndex).isNotNegative();
        assertThat(targetIndex).isGreaterThan(otherIndex);
        assertThat(commands.get(targetIndex + 1)).isEqualTo("C,1,______,_,__;3;200.00;;;;");
        assertThat(commands).contains("T,1,______,_,__;1;800.00;;;;");
    }

    private FiscalAgentService newFiscalAgentService(
            FakeHttpClient httpClient,
            CustomerVoucherRepository voucherRepository) {
        FiscalAgentService service = new FiscalAgentService(voucherRepository);
        ReflectionTestUtils.setField(service, "httpClient", httpClient);
        return service;
    }

    private LoadedReceipt createAndLoadDetached(java.util.function.Consumer<TestData> scenario) {
        return transactionTemplate.execute(status -> {
            TestData data = createBaseReceipt();
            scenario.accept(data);

            entityManager.flush();
            entityManager.clear();

            receiptRepository.findByIdWithItems(data.receipt().getId()).orElseThrow();
            Receipt receipt = receiptRepository.findByIdWithPayments(data.receipt().getId()).orElseThrow();
            return new LoadedReceipt(receipt);
        });
    }

    private TestData createBaseReceipt() {
        Warehouse gv = findOrCreate(Warehouse.class, "GV",
                () -> Warehouse.builder().code("GV").name("Gestiune vanzare").build());
        ReceiptStatus pending = findOrCreate(ReceiptStatus.class, "FISCAL_PENDING",
                () -> ReceiptStatus.builder().code("FISCAL_PENDING").label("Fiscal pending").build());
        PaymentMethod card = findOrCreate(PaymentMethod.class, "CARD",
                () -> PaymentMethod.builder().code("CARD").label("Card").build());
        PaymentMethod bankTransfer = findOrCreate(PaymentMethod.class, "BANK_TRANSFER",
                () -> PaymentMethod.builder().code("BANK_TRANSFER").label("Transfer bancar").build());
        PaymentMethod advance = findOrCreate(PaymentMethod.class, "ADVANCE",
                () -> PaymentMethod.builder().code("ADVANCE").label("Avans").build());
        PaymentMethod voucher = findOrCreate(PaymentMethod.class, "VOUCHER",
                () -> PaymentMethod.builder().code("VOUCHER").label("Voucher").build());
        ProductType menuType = findOrCreate(ProductType.class, "MENU",
                () -> ProductType.builder().code("MENU").label("Meniu").build());
        ProductType advanceType = findOrCreate(ProductType.class, "ADVANCE",
                () -> ProductType.builder().code("ADVANCE").label("Avans").build());
        UnitOfMeasure unit = findOrCreate(UnitOfMeasure.class, "BUC",
                () -> UnitOfMeasure.builder().code("BUC").label("Bucata").build());
        VatRate vatRate = findOrCreate(VatRate.class, "TVA21", () -> VatRate.builder()
                .code("TVA21")
                .label("TVA 21")
                .rate(new BigDecimal("21.00"))
                .build());
        Category category = findOrCreate(Category.class, "TEST",
                () -> Category.builder().code("TEST").label("Test").build());
        CampaignType regularCampaignType = findOrCreate(CampaignType.class, "REGULAR", () -> CampaignType.builder()
                .code("REGULAR")
                .label("Regular")
                .build());

        Receipt receipt = persist(Receipt.builder()
                .status(pending)
                .tableName("petrecere test")
                .totalAmount(BigDecimal.ZERO)
                .totalNet(BigDecimal.ZERO)
                .totalVat(BigDecimal.ZERO)
                .build());

        return new TestData(gv, pending, card, bankTransfer, advance, voucher, menuType, advanceType, unit, vatRate,
                category, regularCampaignType, receipt);
    }

    private Product createProduct(String name, ProductType type, TestData data) {
        return persist(Product.builder()
                .name(name)
                .category(data.category())
                .productType(type)
                .unit(data.unit())
                .vatRate(data.vatRate())
                .salePrice(BigDecimal.ZERO)
                .purchasePrice(BigDecimal.ZERO)
                .trackStock(false)
                .isActive(true)
                .build());
    }

    private void addItem(Receipt receipt, Product product, Warehouse warehouse, String amount) {
        BigDecimal value = new BigDecimal(amount);
        ReceiptItem item = ReceiptItem.builder()
                .receipt(receipt)
                .product(product)
                .warehouse(warehouse)
                .quantity(BigDecimal.ONE)
                .unitPrice(value)
                .lineTotal(value)
                .netTotal(value)
                .vatTotal(BigDecimal.ZERO)
                .vatRate(BigDecimal.ZERO)
                .build();
        receipt.addItem(item);
        receipt.setTotalAmount(receipt.getTotalAmount().add(value));
        receipt.setTotalNet(receipt.getTotalNet().add(value));
        persist(item);
    }

    private void addPayment(Receipt receipt, PaymentMethod method, Warehouse warehouse, String amount) {
        ReceiptPayment payment = ReceiptPayment.builder()
                .receipt(receipt)
                .paymentMethod(method)
                .warehouse(warehouse)
                .amount(new BigDecimal(amount))
                .paidAt(LocalDateTime.now())
                .build();
        receipt.addPayment(payment);
        persist(payment);
    }

    private CustomerVoucher usedVoucher(Integer applicableProductId) {
        CampaignType campaignType = CampaignType.builder()
                .code("REGULAR")
                .label("Regular")
                .build();
        VoucherCampaign campaign = VoucherCampaign.builder()
                .name("Voucher produs")
                .validFromDate(LocalDate.now().minusDays(1))
                .validUntilDate(LocalDate.now().plusDays(30))
                .active(true)
                .discountType("FIXED")
                .discountValue(new BigDecimal("200.00"))
                .validDays(30)
                .prefix("TEST")
                .codeLength(6)
                .campaignType(campaignType)
                .applicableProductId(applicableProductId)
                .build();

        return CustomerVoucher.builder()
                .code("TEST-" + System.nanoTime())
                .campaign(campaign)
                .discountType("FIXED")
                .discountValue(new BigDecimal("200.00"))
                .expiresAt(LocalDateTime.now().plusDays(30))
                .used(true)
                .usedAt(LocalDateTime.now())
                .build();
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }

    private <T> T findOrCreate(Class<T> entityClass, String code, Supplier<T> factory) {
        return entityManager.createQuery(
                        "select e from " + entityClass.getSimpleName() + " e where e.code = :code",
                        entityClass)
                .setParameter("code", code)
                .getResultStream()
                .findFirst()
                .orElseGet(() -> persist(factory.get()));
    }

    private List<String> postedCommands(FakeHttpClient httpClient) throws Exception {
        String postBody = httpClient.postBodies().getFirst();
        Map<?, ?> body = objectMapper.readValue(postBody, Map.class);
        return ((List<?>) body.get("commands")).stream()
                .map(String::valueOf)
                .toList();
    }

    private int indexOfCommandStartingWith(List<String> commands, String prefix) {
        for (int i = 0; i < commands.size(); i++) {
            if (commands.get(i).startsWith(prefix)) {
                return i;
            }
        }
        return -1;
    }

    private record TestData(
            Warehouse gv,
            ReceiptStatus pending,
            PaymentMethod cardMethod,
            PaymentMethod bankTransferMethod,
            PaymentMethod advanceMethod,
            PaymentMethod voucherMethod,
            ProductType menuType,
            ProductType advanceType,
            UnitOfMeasure unit,
            VatRate vatRate,
            Category category,
            CampaignType regularCampaignType,
            Receipt receipt) {
    }

    private record LoadedReceipt(Receipt receipt) {
    }

    private static class FakeHttpClient extends HttpClient {
        private final List<String> postBodies = new ArrayList<>();

        List<String> postBodies() {
            return postBodies;
        }

        @Override
        public <T> HttpResponse<T> send(HttpRequest request, HttpResponse.BodyHandler<T> responseBodyHandler) throws IOException {
            String path = request.uri().getPath();
            String query = request.uri().getQuery();
            if ("POST".equals(request.method()) && "/api/v1/print".equals(path)) {
                postBodies.add(readBody(request));
                return response(request, "{\"ok\":true,\"job_id\":\"job-test\"}");
            }
            if ("/api/v1/status".equals(path) && "job_id=job-test".equals(query)) {
                return response(request, """
                        {"status":"printed","result":{"SlipNumber":"12","nZrep":"3","nFNum":"7","DeviceSerial":"SERIAL"}}
                        """);
            }
            return response(request, "{\"ok\":true,\"jobs\":[]}");
        }

        @Override
        public Optional<CookieHandler> cookieHandler() {
            return Optional.empty();
        }

        @Override
        public Optional<Duration> connectTimeout() {
            return Optional.empty();
        }

        @Override
        public Redirect followRedirects() {
            return Redirect.NEVER;
        }

        @Override
        public Optional<ProxySelector> proxy() {
            return Optional.empty();
        }

        @Override
        public SSLContext sslContext() {
            return null;
        }

        @Override
        public SSLParameters sslParameters() {
            return null;
        }

        @Override
        public Optional<Authenticator> authenticator() {
            return Optional.empty();
        }

        @Override
        public Version version() {
            return Version.HTTP_1_1;
        }

        @Override
        public Optional<Executor> executor() {
            return Optional.empty();
        }

        @Override
        public <T> CompletableFuture<HttpResponse<T>> sendAsync(
                HttpRequest request, HttpResponse.BodyHandler<T> responseBodyHandler) {
            return CompletableFuture.failedFuture(new UnsupportedOperationException());
        }

        @Override
        public <T> CompletableFuture<HttpResponse<T>> sendAsync(
                HttpRequest request,
                HttpResponse.BodyHandler<T> responseBodyHandler,
                HttpResponse.PushPromiseHandler<T> pushPromiseHandler) {
            return CompletableFuture.failedFuture(new UnsupportedOperationException());
        }

        private <T> HttpResponse<T> response(HttpRequest request, String body) {
            @SuppressWarnings("unchecked")
            T typedBody = (T) body;
            return new HttpResponse<>() {
                @Override public int statusCode() { return 200; }
                @Override public HttpRequest request() { return request; }
                @Override public Optional<HttpResponse<T>> previousResponse() { return Optional.empty(); }
                @Override public HttpHeaders headers() { return HttpHeaders.of(Map.of(), (a, b) -> true); }
                @Override public T body() { return typedBody; }
                @Override public Optional<SSLSession> sslSession() { return Optional.empty(); }
                @Override public URI uri() { return request.uri(); }
                @Override public Version version() { return Version.HTTP_1_1; }
            };
        }

        private String readBody(HttpRequest request) throws IOException {
            HttpRequest.BodyPublisher publisher = request.bodyPublisher().orElseThrow();
            BodyCollector collector = new BodyCollector();
            publisher.subscribe(collector);
            return collector.body();
        }
    }

    private static class BodyCollector implements Flow.Subscriber<ByteBuffer> {
        private final ByteArrayOutputStream out = new ByteArrayOutputStream();
        private final CountDownLatch done = new CountDownLatch(1);
        private volatile Throwable error;

        @Override
        public void onSubscribe(Flow.Subscription subscription) {
            subscription.request(Long.MAX_VALUE);
        }

        @Override
        public void onNext(ByteBuffer item) {
            byte[] bytes = new byte[item.remaining()];
            item.get(bytes);
            out.writeBytes(bytes);
        }

        @Override
        public void onError(Throwable throwable) {
            error = throwable;
            done.countDown();
        }

        @Override
        public void onComplete() {
            done.countDown();
        }

        String body() throws IOException {
            try {
                if (!done.await(5, TimeUnit.SECONDS)) {
                    throw new IOException("Timed out reading request body");
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IOException(e);
            }
            if (error != null) {
                throw new IOException(error);
            }
            return out.toString(StandardCharsets.UTF_8);
        }
    }
}
