// src/components/ui/FilterButton.tsx
"use client";

import { Filter } from "lucide-react";

interface FilterButtonProps {
  onClick: () => void;
  hasActiveFilters: boolean;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  onClick,
  hasActiveFilters,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        lg:hidden fixed bottom-6 right-6 z-30 p-4 rounded-full shadow-lg transition-all duration-200
        ${
          hasActiveFilters
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-700 border border-gray-300"
        }
        hover:scale-105 active:scale-95
      `}
    >
      <Filter className="w-6 h-6" />
      {hasActiveFilters && (
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
          !
        </span>
      )}
    </button>
  );
};

export default FilterButton;
