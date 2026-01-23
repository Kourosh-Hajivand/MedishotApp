/** @format */

import { useState, useEffect } from "react";
type props<T> = {
 value: T;
 Delay: number;
};
function useDebounce<T>({ value, Delay }: props<T>) {
 const [debouncedValue, setDebouncedValue] = useState(value);
 useEffect(() => {
  const debounce = setTimeout(() => {
   setDebouncedValue(value);
  }, Delay);
  return () => {
   clearTimeout(debounce);
  };
 }, [value, Delay]);
 return debouncedValue;
}
export default useDebounce;
