import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { CateringService } from '../api/CateringService';

export const useCateringOrderModal = (open, editData, context, onSubmit) => {
  const [allProducts, setAllProducts] = useState([]);
  const [basket, setBasket] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Calcul dată afișare
  const rawDate = context?.reservationDate ? dayjs(context.reservationDate) : dayjs();
  const displayDate = rawDate.isValid() ? rawDate : dayjs();

  // 1. Fetch Products
  useEffect(() => {
    if (open) {
      CateringService.getAvailableProducts().then(data => setAllProducts(data || []));
    }
  }, [open]);

  // 2. Init Basket (Edit vs New)
  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setShowDropdown(false);

      if (editData) {
        const initialBasket = editData.items.map(item => ({
          product: { id: item.productId, name: item.productName },
          quantity: item.quantity,
          originalId: item.id
        }));
        setBasket(initialBasket);
      } else {
        setBasket([]);
      }
    }
  }, [open, editData]);

  // 3. Filtering
  const availableProducts = allProducts.filter(p => {
    return p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
           !basket.some(item => item.product.id === p.id);
  });

  // 4. Basket Actions
  const handleAddToBasket = (product) => {
    setBasket(prev => [...prev, { product, quantity: 1 }]);
    setSearchTerm(''); // Opțional: reset search după adăugare
  };

  const handleUpdateQuantity = (pid, delta) => {
    setBasket(prev => prev.map(item => item.product.id === pid ? { ...item, quantity: item.quantity + delta } : item).filter(i => i.quantity > 0));
  };

  const handleManualQuantity = (pid, val) => {
    const qty = parseInt(val) || 0;
    setBasket(prev => qty <= 0 ? prev.filter(i => i.product.id !== pid) : prev.map(i => i.product.id === pid ? { ...i, quantity: qty } : i));
  };

  const submitBasket = () => {
    if (basket.length === 0) return;

    // Logică dată
    let dateToUse;
    if (editData && editData.items.length > 0) {
        dateToUse = dayjs(editData.items[0].orderDate).format('YYYY-MM-DD');
    } else {
        dateToUse = displayDate.format('YYYY-MM-DD');
    }

    const itemsPayload = basket.map(item => ({
        id: item.originalId,
        productId: item.product.id,
        quantity: item.quantity,
        orderDate: dateToUse,
        reservationId: editData?.reservationId || context?.reservationId || null
    }));

    onSubmit(itemsPayload);
  };

  return {
    basket,
    searchTerm,
    setSearchTerm,
    showDropdown,
    setShowDropdown,
    availableProducts,
    displayDate,
    // Actions
    handleAddToBasket,
    handleUpdateQuantity,
    handleManualQuantity,
    submitBasket
  };
};