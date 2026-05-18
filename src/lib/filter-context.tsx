'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface IssueFilters {
  difficulty: 'All' | 'Easy' | 'Medium' | 'Hard';
  type: 'All' | 'Documentation' | 'Bug' | 'Feature' | 'Design' | 'Test' | 'Refactor';
  datePosted: 'All' | 'Today' | 'This Week' | 'This Month';
  competition: 'All' | 'Low' | 'Medium' | 'High';
}

export const DEFAULT_FILTERS: IssueFilters = {
  difficulty: 'All',
  type: 'All',
  datePosted: 'All',
  competition: 'All',
};

interface FilterContextType {
  filters: IssueFilters;
  setFilter: <K extends keyof IssueFilters>(key: K, value: IssueFilters[K]) => void;
  resetFilters: () => void;
  activeCount: number;
}

const FilterContext = createContext<FilterContextType>({
  filters: DEFAULT_FILTERS,
  setFilter: () => {},
  resetFilters: () => {},
  activeCount: 0,
});

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<IssueFilters>(DEFAULT_FILTERS);

  const setFilter = useCallback(<K extends keyof IssueFilters>(key: K, value: IssueFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const activeCount = Object.values(filters).filter(v => v !== 'All').length;

  return (
    <FilterContext.Provider value={{ filters, setFilter, resetFilters, activeCount }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  return useContext(FilterContext);
}
