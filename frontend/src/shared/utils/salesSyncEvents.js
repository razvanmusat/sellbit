const SALES_DATA_CHANGED_EVENT = 'sellbit:sales-data-changed';

export const emitSalesDataChanged = (payload = {}) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SALES_DATA_CHANGED_EVENT, {
      detail: {
        ...payload,
        timestamp: Date.now()
      }
    })
  );
};

export const onSalesDataChanged = (handler) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const wrappedHandler = (event) => {
    handler(event?.detail || {});
  };

  window.addEventListener(SALES_DATA_CHANGED_EVENT, wrappedHandler);

  return () => {
    window.removeEventListener(SALES_DATA_CHANGED_EVENT, wrappedHandler);
  };
};
