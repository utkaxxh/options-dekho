import { useState, useMemo } from 'react';
import { ArrowUpDown, Filter } from 'lucide-react';
import type { OptionsData } from '../types';

interface OptionsTableProps {
  optionsData: OptionsData;
}

type SortField = 'strike' | 'premium' | 'volume' | 'openInterest' | 'impliedVolatility' | 'timeToExpiry';
type SortDirection = 'asc' | 'desc';

const OptionsTable = ({ optionsData }: OptionsTableProps) => {
  const [sortField, setSortField] = useState<SortField>('strike');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterExpiry, setFilterExpiry] = useState<number | 'all'>('all');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedOptions = useMemo(() => {
    let filtered = optionsData.puts;
    
    // Filter by expiry
    if (filterExpiry !== 'all') {
      filtered = filtered.filter(option => option.timeToExpiry === filterExpiry);
    }
    
    // Sort
    return filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const modifier = sortDirection === 'asc' ? 1 : -1;
      
      if (aVal < bVal) return -1 * modifier;
      if (aVal > bVal) return 1 * modifier;
      return 0;
    });
  }, [optionsData.puts, sortField, sortDirection, filterExpiry]);

  const availableExpiries = useMemo(() => {
    const expiries = [...new Set(optionsData.puts.map(opt => opt.timeToExpiry))];
    return expiries.sort((a, b) => a - b);
  }, [optionsData.puts]);

  const getMoneyness = (strike: number, currentPrice: number) => {
    const ratio = strike / currentPrice;
    if (ratio < 0.95) return { label: 'OTM', className: 'otm' };
    if (ratio > 1.05) return { label: 'ITM', className: 'itm' };
    return { label: 'ATM', className: 'atm' };
  };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="options-table-container">
      <div className="table-controls">
        <div className="filter-controls">
          <Filter size={16} />
          <select 
            value={filterExpiry} 
            onChange={(e) => setFilterExpiry(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="expiry-filter"
          >
            <option value="all">All Expiries</option>
            {availableExpiries.map(expiry => (
              <option key={expiry} value={expiry}>
                {expiry} days to expiry
              </option>
            ))}
          </select>
        </div>
        
        <div className="table-info">
          Showing {filteredAndSortedOptions.length} put options
        </div>
      </div>

      <div className="table-wrapper">
        <table className="options-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('strike')} className="sortable">
                Strike Price
                <ArrowUpDown size={14} />
              </th>
              <th>Moneyness</th>
              <th onClick={() => handleSort('premium')} className="sortable">
                Premium
                <ArrowUpDown size={14} />
              </th>
              <th onClick={() => handleSort('volume')} className="sortable">
                Volume
                <ArrowUpDown size={14} />
              </th>
              <th onClick={() => handleSort('openInterest')} className="sortable">
                Open Interest
                <ArrowUpDown size={14} />
              </th>
              <th onClick={() => handleSort('impliedVolatility')} className="sortable">
                IV
                <ArrowUpDown size={14} />
              </th>
              <th>Delta</th>
              <th>Gamma</th>
              <th>Theta</th>
              <th>Vega</th>
              <th onClick={() => handleSort('timeToExpiry')} className="sortable">
                Days to Expiry
                <ArrowUpDown size={14} />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedOptions.map((option, index) => {
              const moneyness = getMoneyness(option.strike, optionsData.currentPrice);
              return (
                <tr key={`${option.strike}-${option.timeToExpiry}-${index}`}>
                  <td className="strike-price">
                    {formatCurrency(option.strike)}
                  </td>
                  <td>
                    <span className={`moneyness ${moneyness.className}`}>
                      {moneyness.label}
                    </span>
                  </td>
                  <td className="premium">
                    {formatCurrency(option.premium)}
                  </td>
                  <td className="volume">
                    {option.volume.toLocaleString()}
                  </td>
                  <td className="open-interest">
                    {option.openInterest.toLocaleString()}
                  </td>
                  <td className="iv">
                    {formatPercentage(option.impliedVolatility)}
                  </td>
                  <td className={`delta ${option.delta < 0 ? 'negative' : 'positive'}`}>
                    {option.delta.toFixed(3)}
                  </td>
                  <td className="gamma">
                    {option.gamma.toFixed(4)}
                  </td>
                  <td className={`theta ${option.theta < 0 ? 'negative' : 'positive'}`}>
                    {option.theta.toFixed(2)}
                  </td>
                  <td className="vega">
                    {option.vega.toFixed(2)}
                  </td>
                  <td className="expiry">
                    {option.timeToExpiry}d
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredAndSortedOptions.length === 0 && (
        <div className="no-data">
          No options data available for the selected filters.
        </div>
      )}
    </div>
  );
};

export default OptionsTable;
