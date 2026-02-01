import { useDispatch, useSelector } from 'react-redux';

// Folosește aceste două hook-uri în toată aplicația în loc de cele standard
// Ele sunt pregătite să "înțeleagă" structura store-ului nostru

export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;