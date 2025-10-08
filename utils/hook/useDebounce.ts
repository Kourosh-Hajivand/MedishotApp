/** @format */

import { useState, useEffect } from "react";
type props = {
 value: any;
 Delay: number;
};
function useDebounce({ value, Delay }: props) {
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
