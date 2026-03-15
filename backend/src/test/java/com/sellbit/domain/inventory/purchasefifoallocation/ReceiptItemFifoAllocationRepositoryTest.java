package com.sellbit.domain.inventory.purchasefifoallocation;

import com.sellbit.domain.inventory.purchase.Purchase;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receiptitem.ReceiptItem;
import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.category.Category;
import com.sellbit.domain.lookup.producttype.ProductType;
import com.sellbit.domain.lookup.unitofmeasure.UnitOfMeasure;
import com.sellbit.domain.lookup.vatrate.VatRate;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatus;
import com.sellbit.domain.security.user.User;
import com.sellbit.domain.lookup.userrole.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
class ReceiptItemFifoAllocationRepositoryTest {
    @Autowired
    private ReceiptItemFifoAllocationRepository repo;
    @Autowired
    private org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager em;


    private Receipt buildAndPersistReceipt() {
        // Try to find existing UserRole with code 'ADMIN' to avoid unique constraint violation
        UserRole role = em.getEntityManager()
            .createQuery("SELECT r FROM UserRole r WHERE r.code = :code", UserRole.class)
            .setParameter("code", "ADMIN")
            .getResultStream()
            .findFirst()
            .orElseGet(() -> em.persist(UserRole.builder().code("ADMIN").label("Admin").authorityLevel(100).build()));
        // User
        User user = em.persist(User.builder().username("testuser").passwordHash("x").role(role).build());
        // Warehouse
        Warehouse warehouse = em.persist(Warehouse.builder().code("W1").name("Main").build());
        // Status
        ReceiptStatus status = em.getEntityManager()
            .createQuery("SELECT s FROM ReceiptStatus s WHERE s.code = :code", ReceiptStatus.class)
            .setParameter("code", "OPEN")
            .getResultStream()
            .findFirst()
            .orElseGet(() -> em.persist(ReceiptStatus.builder().code("OPEN").label("Deschis").build()));
        // Receipt
        Receipt receipt = Receipt.builder()
                .status(status)
                .warehouse(warehouse)
                .user(user)
                .tableName("T1")
                .totalAmount(BigDecimal.TEN)
                .build();
        return em.persist(receipt);
    }

    private Product buildAndPersistProduct() {
        // Find or create required lookup entities
        Category category = em.getEntityManager()
            .createQuery("SELECT c FROM Category c WHERE c.code = :code", Category.class)
            .setParameter("code", "CAT1")
            .getResultStream()
            .findFirst()
            .orElseGet(() -> em.persist(Category.builder().code("CAT1").label("TestCat").build()));

        ProductType productType = em.getEntityManager()
            .createQuery("SELECT p FROM ProductType p WHERE p.code = :code", ProductType.class)
            .setParameter("code", "REGULAR")
            .getResultStream()
            .findFirst()
            .orElseGet(() -> em.persist(ProductType.builder().code("REGULAR").label("Produs stoc").build()));

        UnitOfMeasure unit = em.getEntityManager()
            .createQuery("SELECT u FROM UnitOfMeasure u WHERE u.code = :code", UnitOfMeasure.class)
            .setParameter("code", "BUC")
            .getResultStream()
            .findFirst()
            .orElseGet(() -> em.persist(UnitOfMeasure.builder().code("BUC").label("Bucata").build()));

        VatRate vatRate = em.getEntityManager()
            .createQuery("SELECT v FROM VatRate v WHERE v.code = :code", VatRate.class)
            .setParameter("code", "TVA21")
            .getResultStream()
            .findFirst()
            .orElseGet(() -> em.persist(VatRate.builder().code("TVA21").label("TVA 21% (Standard)").rate(new java.math.BigDecimal("21.00")).build()));

        return em.persist(Product.builder()
            .name("TestProd")
            .category(category)
            .productType(productType)
            .unit(unit)
            .vatRate(vatRate)
            .build());
    }

    private Purchase buildAndPersistPurchase(Product product, Warehouse warehouse, User user) {
        return em.persist(Purchase.builder()
                .product(product)
                .warehouse(warehouse)
                .user(user)
                .quantity(BigDecimal.TEN)
                .purchasePrice(BigDecimal.valueOf(5))
                .build());
    }

    private ReceiptItem buildAndPersistReceiptItem(Receipt receipt, Product product) {
        return em.persist(ReceiptItem.builder()
            .receipt(receipt)
            .product(product)
            .quantity(BigDecimal.ONE)
            .unitPrice(BigDecimal.valueOf(10))
            .warehouse(receipt.getWarehouse())
            .build());
    }

    @Test
    void testSaveAndFindByReceiptId() {
        Receipt receipt = buildAndPersistReceipt();
        Product product = buildAndPersistProduct();
        ReceiptItem item = buildAndPersistReceiptItem(receipt, product);
        Purchase purchase = buildAndPersistPurchase(product, receipt.getWarehouse(), receipt.getUser());
        Warehouse warehouse = receipt.getWarehouse();
        ReceiptItemFifoAllocation alloc = ReceiptItemFifoAllocation.builder()
                .receipt(receipt)
                .receiptItem(item)
                .purchase(purchase)
                .warehouse(warehouse)
                .quantity(BigDecimal.valueOf(5))
                .unitCost(BigDecimal.valueOf(2.5))
                .build();
        repo.save(alloc);
        List<ReceiptItemFifoAllocation> found = repo.findByReceiptId(receipt.getId());
        assertEquals(1, found.size());
        assertEquals(item.getId(), found.get(0).getReceiptItem().getId());
    }


    @Test
    void testExistsByReceiptId() {
        Receipt receipt = buildAndPersistReceipt();
        Product product = buildAndPersistProduct();
        ReceiptItem item = buildAndPersistReceiptItem(receipt, product);
        Purchase purchase = buildAndPersistPurchase(product, receipt.getWarehouse(), receipt.getUser());
        Warehouse warehouse = receipt.getWarehouse();
        ReceiptItemFifoAllocation alloc = ReceiptItemFifoAllocation.builder()
                .receipt(receipt)
                .receiptItem(item)
                .purchase(purchase)
                .warehouse(warehouse)
                .quantity(BigDecimal.ONE)
                .unitCost(BigDecimal.ONE)
                .build();
        repo.save(alloc);
        assertTrue(repo.existsByReceiptId(receipt.getId()));
        assertFalse(repo.existsByReceiptId(-1));
    }


    @Test
    void testDeleteByReceiptId() {
        Receipt receipt = buildAndPersistReceipt();
        Product product = buildAndPersistProduct();
        ReceiptItem item = buildAndPersistReceiptItem(receipt, product);
        Purchase purchase = buildAndPersistPurchase(product, receipt.getWarehouse(), receipt.getUser());
        Warehouse warehouse = receipt.getWarehouse();
        ReceiptItemFifoAllocation alloc = ReceiptItemFifoAllocation.builder()
                .receipt(receipt)
                .receiptItem(item)
                .purchase(purchase)
                .warehouse(warehouse)
                .quantity(BigDecimal.ONE)
                .unitCost(BigDecimal.ONE)
                .build();
        repo.save(alloc);
        repo.deleteByReceiptId(receipt.getId());
        assertFalse(repo.existsByReceiptId(receipt.getId()));
    }
}
