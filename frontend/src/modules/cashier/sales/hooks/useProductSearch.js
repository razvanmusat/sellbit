import { useState, useRef } from 'react';
import { SearchProductService } from '../../sales/api/SearchProductService'; 
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

export const useProductSearch = (onlyTrackStock = false) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    
    const debounceTimeout = useRef(null);

    // Funcția care face apelul efectiv
    const searchProducts = async (searchQuery) => {
        if (searchQuery.length < 2) {
            setResults([]);
            setHasSearched(false);
            setErrorMsg('');
            return;
        }

        setLoading(true);
        setHasSearched(true);
        setErrorMsg('');

        try {
            const data = await SearchProductService.searchProductsByName(searchQuery);
            const finalData = onlyTrackStock ? data.filter(p => p.trackStock === true) : data;
            setResults(finalData);
        } catch (error) {
            console.error('Search failed:', error);
            setResults([]);
            // Aici aplicăm dicționarul
            setErrorMsg(getFriendlyErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    // Handler pentru input (cu Debounce)
    const handleQueryChange = (e) => {
        const newQuery = e.target.value;
        setQuery(newQuery);
        setErrorMsg(''); // Resetăm eroarea când scrie

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

        debounceTimeout.current = setTimeout(() => {
            searchProducts(newQuery);
        }, 300);
    };

    // Funcție de reset complet
    const clearSearch = () => {
        setResults([]);
        setQuery('');
        setHasSearched(false);
        setErrorMsg('');
    };

    return {
        query,
        results,
        loading,
        hasSearched,
        errorMsg,
        handleQueryChange,
        clearSearch
    };
};