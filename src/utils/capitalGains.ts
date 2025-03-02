import { Transaction, CapitalGain } from '../types';

interface StockLot {
  date: string;
  quantity: number;
  price: number;
  priceCurrency: string;
  exchangeRate: number;
  transactionCosts: number;
  isin: string;
}

interface GainKey {
  symbol: string;
  purchaseDate: string;
  saleDate: string;
}

// Helper function to round to 2 decimal places
const roundToTwo = (num: number): number => {
  return Number(Math.round(num * 100) / 100);
};

export const calculateCapitalGains = (transactions: Transaction[]): CapitalGain[] => {
  const gainsMap = new Map<string, CapitalGain>();
  const stockLots: Record<string, StockLot[]> = {};

  // Sort transactions by date and time
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateTimeA = new Date(`${a.date}T${a.time}`);
    const dateTimeB = new Date(`${b.date}T${b.time}`);
    return dateTimeA.getTime() - dateTimeB.getTime();
  });

  for (const transaction of sortedTransactions) {
    const {
      symbol,
      quantity,
      price,
      date,
      priceCurrency,
      exchangeRate,
      transactionCosts,
      isin
    } = transaction;

    // Negative quantity means it's a sell transaction
    if (quantity > 0) {
      // Buy transaction
      if (!stockLots[symbol]) {
        stockLots[symbol] = [];
      }
      stockLots[symbol].push({
        date,
        quantity,
        price,
        priceCurrency,
        exchangeRate,
        transactionCosts,
        isin
      });
    } else {
      // Sell transaction
      const sellQuantity = Math.abs(quantity);
      if (!stockLots[symbol] || stockLots[symbol].length === 0) {
        console.warn(`Attempting to sell ${symbol} without any lots available`);
        continue;
      }

      let remainingQuantity = sellQuantity;
      while (remainingQuantity > 0 && stockLots[symbol].length > 0) {
        const lot = stockLots[symbol][0];
        const soldQuantity = Math.min(remainingQuantity, lot.quantity);
        
        // Calculate raw amounts in EUR first
        const rawBoughtAmount = (lot.price * soldQuantity) / lot.exchangeRate;
        const rawSoldAmount = (price * soldQuantity) / exchangeRate;
        
        // Round the final amounts
        const boughtAmount = roundToTwo(rawBoughtAmount);
        const soldAmount = roundToTwo(rawSoldAmount);
        const profitInEUR = roundToTwo(rawSoldAmount - rawBoughtAmount);
        
        // Calculate proportional transaction costs without intermediate rounding
        const buyTransactionCosts = (lot.transactionCosts * soldQuantity) / lot.quantity;
        const sellTransactionCosts = (transactionCosts * soldQuantity) / sellQuantity;
        const totalTransactionCosts = roundToTwo(buyTransactionCosts + sellTransactionCosts);

        // Create a unique key for this combination of symbol and dates
        const gainKey = `${symbol}_${lot.date}_${date}`;

        // If we already have a gain with this key, update it
        if (gainsMap.has(gainKey)) {
          const existingGain = gainsMap.get(gainKey)!;
          existingGain.quantity += soldQuantity;
          existingGain.boughtAmount = roundToTwo(existingGain.boughtAmount + rawBoughtAmount);
          existingGain.soldAmount = roundToTwo(existingGain.soldAmount + rawSoldAmount);
          existingGain.profitInEUR = roundToTwo(existingGain.soldAmount - existingGain.boughtAmount);
          existingGain.transactionCosts = roundToTwo(existingGain.transactionCosts + totalTransactionCosts);
        } else {
          // Create a new gain entry
          gainsMap.set(gainKey, {
            symbol,
            isin,
            purchaseDate: lot.date,
            saleDate: date,
            quantity: soldQuantity,
            boughtAmount,
            boughtCurrency: 'EUR',
            soldAmount,
            soldCurrency: 'EUR',
            profitInEUR,
            transactionCosts: totalTransactionCosts,
            exchangeRate
          });
        }

        remainingQuantity -= soldQuantity;
        lot.quantity -= soldQuantity;

        if (lot.quantity === 0) {
          stockLots[symbol].shift();
        }
      }
    }
  }

  // Convert the map to an array and sort by symbol and dates
  return Array.from(gainsMap.values()).sort((a, b) => {
    // First sort by symbol
    if (a.symbol < b.symbol) return -1;
    if (a.symbol > b.symbol) return 1;
    
    // Then by purchase date
    const purchaseCompare = new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
    if (purchaseCompare !== 0) return purchaseCompare;
    
    // Finally by sale date
    return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
  });
}; 