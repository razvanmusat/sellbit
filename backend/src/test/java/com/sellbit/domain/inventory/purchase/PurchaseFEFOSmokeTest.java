package com.sellbit.domain.inventory.purchase;

import com.sellbit.domain.catalog.category.Category;
import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.lookup.producttype.ProductType;
import com.sellbit.domain.lookup.unitofmeasure.UnitOfMeasure;
import com.sellbit.domain.lookup.userrole.UserRole;
import com.sellbit.domain.lookup.vatrate.VatRate;
import com.sellbit.domain.security.user.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import(PurchaseService.class)
class PurchaseFEFOSmokeTest {

    @Autowired private EntityManager entityManager;
    @Autowired private PurchaseRepository purchaseRepository;
    @Autowired private PurchaseService purchaseService;

    @Test
    void deductsNearestExpirationBeforeOlderReceptionAndNullExpiration() {
        UserRole role = persist(UserRole.builder()
                .code("FEFO_ADMIN").label("FEFO Admin").authorityLevel(100).build());
        User user = persist(User.builder()
                .username("fefo-admin").passwordHash("test").fullName("FEFO Admin").role(role).build());
        Warehouse warehouse = persist(Warehouse.builder()
                .code("FEFO_WH").name("FEFO Warehouse").build());
        Category category = persist(Category.builder()
                .code("FEFO_CAT").label("FEFO Category").build());
        ProductType type = persist(ProductType.builder()
                .code("FEFO_REGULAR").label("FEFO Regular").build());
        UnitOfMeasure unit = persist(UnitOfMeasure.builder()
                .code("FEFO_BUC").label("Bucata").build());
        VatRate vatRate = persist(VatRate.builder()
                .code("FEFO_TVA").label("TVA").rate(new BigDecimal("21.00")).build());
        Product product = persist(Product.builder()
                .name("Produs smoke FEFO")
                .category(category)
                .productType(type)
                .unit(unit)
                .vatRate(vatRate)
                .trackStock(true)
                .build());

        Purchase olderReceptionLaterExpiry = persist(batch(product, warehouse, user,
                LocalDateTime.of(2026, 1, 1, 10, 0), LocalDate.of(2026, 12, 31)));
        Purchase newerReceptionEarlierExpiry = persist(batch(product, warehouse, user,
                LocalDateTime.of(2026, 2, 1, 10, 0), LocalDate.of(2026, 9, 1)));
        Purchase withoutExpiration = persist(batch(product, warehouse, user,
                LocalDateTime.of(2025, 1, 1, 10, 0), null));

        entityManager.flush();
        entityManager.clear();

        List<Purchase> ordered = purchaseRepository.findActiveBatchesFEFO(warehouse.getId(), product.getId());
        assertThat(ordered).extracting(Purchase::getId).containsExactly(
                newerReceptionEarlierExpiry.getId(),
                olderReceptionLaterExpiry.getId(),
                withoutExpiration.getId());

        purchaseService.deductFromBatchesFEFO(warehouse.getId(), product.getId(), BigDecimal.ONE);
        entityManager.flush();
        entityManager.clear();

        assertThat(purchaseRepository.findById(newerReceptionEarlierExpiry.getId()).orElseThrow()
                .getRemainingQuantity()).isEqualByComparingTo("4.000");
        assertThat(purchaseRepository.findById(olderReceptionLaterExpiry.getId()).orElseThrow()
                .getRemainingQuantity()).isEqualByComparingTo("5.000");
        assertThat(purchaseRepository.findById(withoutExpiration.getId()).orElseThrow()
                .getRemainingQuantity()).isEqualByComparingTo("5.000");
    }

    private Purchase batch(Product product, Warehouse warehouse, User user,
            LocalDateTime purchasedAt, LocalDate expirationDate) {
        return Purchase.builder()
                .product(product)
                .warehouse(warehouse)
                .user(user)
                .quantity(new BigDecimal("5.000"))
                .remainingQuantity(new BigDecimal("5.000"))
                .purchasePrice(new BigDecimal("10.00"))
                .purchasedAt(purchasedAt)
                .expirationDate(expirationDate)
                .build();
    }

    private <T> T persist(T entity) {
        entityManager.persist(entity);
        return entity;
    }
}
