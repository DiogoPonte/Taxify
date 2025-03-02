import { ChangeEvent, useState } from 'react';
import Papa from 'papaparse';
import { FileUploadProps, Transaction } from '../types';
import '../styles/FileUpload.css';

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = (file: File) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: "UTF-8",
      delimiter: ",", // Explicitly set delimiter
      complete: (results: Papa.ParseResult<string[]>) => {
        try {
          console.log('Raw CSV data:', results.data);
          
          if (results.data.length < 2) {
            setError('File appears to be empty or has no data rows');
            return;
          }

          const transactions: Transaction[] = results.data.slice(1).map((row: string[], rowIndex: number) => {
            try {
              console.log(`Processing row ${rowIndex + 1}:`, row);

              // Get values directly from array indices based on the CSV structure
              const [
                date,              // 0
                time,             // 1
                symbol,           // 2
                isin,             // 3
                exchangeFrom,     // 4
                exchange,         // 5
                quantityStr,      // 6
                priceStr,         // 7
                priceCurrency,    // 8
                localValueStr,    // 9
                localCurrency,    // 10
                valueEURStr,      // 11
                _valueCurrency,   // 12
                exchangeRateStr,  // 13
                transactionCostsStr, // 14
                costsCurrency,    // 15
                totalStr,         // 16
                totalCurrency,    // 17
                orderId           // 18
              ] = row;

              console.log('Extracted values:', {
                date, time, symbol, isin, exchangeFrom, exchange,
                quantityStr, priceStr, priceCurrency,
                localValueStr, localCurrency,
                valueEURStr, exchangeRateStr,
                transactionCostsStr, costsCurrency,
                totalStr, totalCurrency, orderId
              });

              if (!date) {
                throw new Error(`Missing date in row ${rowIndex + 1}`);
              }

              // Parse the date from DD-MM-YYYY to YYYY-MM-DD
              const [day, month, year] = date.split('-');
              if (!day || !month || !year) {
                throw new Error(`Invalid date format in row ${rowIndex + 1}: ${date}`);
              }
              const formattedDate = `${year}-${month}-${day}`;

              // Parse numeric values, removing any currency symbols and spaces
              const cleanNumber = (str: string) => {
                if (!str) return 0;
                // Remove currency symbols, spaces, and convert to standard format
                return Number(str.replace(/[^0-9.-]/g, ''));
              };

              const quantity = cleanNumber(quantityStr);
              const price = cleanNumber(priceStr);
              const localValue = Math.abs(cleanNumber(localValueStr));
              const valueEUR = Math.abs(cleanNumber(valueEURStr));
              const exchangeRate = exchangeRateStr ? cleanNumber(exchangeRateStr) : 1;
              const transactionCosts = cleanNumber(transactionCostsStr);
              const total = Math.abs(cleanNumber(totalStr));

              console.log('Parsed numbers:', {
                quantity, price, localValue, valueEUR,
                exchangeRate, transactionCosts, total
              });

              if (isNaN(quantity) || isNaN(price)) {
                throw new Error(`Invalid quantity or price in row ${rowIndex + 1}`);
              }

              const transaction: Transaction = {
                date: formattedDate,
                time: time || '',
                symbol: symbol || '',
                isin: isin || '',
                exchangeFrom: exchangeFrom || '',
                exchange: exchange || '',
                quantity,
                price,
                priceCurrency: priceCurrency?.trim() || 'EUR',
                localValue,
                localCurrency: localCurrency?.trim() || 'EUR',
                valueEUR,
                exchangeRate,
                transactionCosts,
                costsCurrency: costsCurrency?.trim() || 'EUR',
                total,
                totalCurrency: totalCurrency?.trim() || 'EUR',
                orderId: orderId || ''
              };

              console.log('Created transaction:', transaction);
              return transaction;
            } catch (rowError) {
              console.error(`Error processing row ${rowIndex + 1}:`, rowError);
              throw rowError;
            }
          });
          
          console.log('Successfully processed transactions:', transactions);
          setError(null);
          onFileUpload(transactions);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(`Error processing file: ${errorMessage}`);
          console.error('Error details:', err);
        }
      },
      error: (error) => {
        setError(`Error parsing file: ${error.message}`);
        console.error('Papa Parse error:', error);
      }
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="file-input"
        />
        <div className="file-upload-content">
          <p>Drag and drop your transactions CSV file here or click to select</p>
          <small>Supported format: Trading platform export CSV with transaction details</small>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}; 