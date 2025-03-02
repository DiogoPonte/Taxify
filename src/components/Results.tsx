import { ResultsProps, AnexoJ } from '../types';
import * as XLSX from 'xlsx';
import { Builder } from 'xml2js';
import { useState, useMemo, useEffect } from 'react';
import { IRSUpload } from './IRSUpload';
import { FileUpload } from './FileUpload';
import '../styles/Results.css';
import countryCodes from '../utils/countryCodes';

type ViewType = 'transactions' | 'gains';

export const Results: React.FC<ResultsProps> = ({
  transactions,
  gains,
  onFileUpload,
  onDownloadCSV,
  onDownloadExcel,
  onExportXML
}) => {
  const [activeView, setActiveView] = useState<ViewType>(gains.length > 0 ? 'gains' : 'transactions');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [showIRSUpload, setShowIRSUpload] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [modifiedIRSXml, setModifiedIRSXml] = useState<string | null>(null);
  const [uploadedXmlDoc, setUploadedXmlDoc] = useState<Document | null>(null);

  // Filter gains based on date range
  const filteredGains = useMemo(() => {
    let filtered = [...gains].sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    
    if (fromDate) {
      filtered = filtered.filter(gain => gain.saleDate >= fromDate);
    }
    if (toDate) {
      filtered = filtered.filter(gain => gain.saleDate <= toDate);
    }
    
    return filtered;
  }, [gains, fromDate, toDate]);

  const totalNetGainEUR = filteredGains.reduce((sum, gain) => sum + gain.profitInEUR, 0);

  const handleDateChange = (type: 'from' | 'to', value: string) => {
    if (type === 'from') {
      setFromDate(value);
    } else {
      setToDate(value);
    }
  };

  const handleCSVDownload = () => {
    let csvContent;
    
    if (activeView === 'transactions') {
      csvContent = [
        [
          'Date',
          'Time',
          'Symbol',
          'ISIN',
          'Exchange',
          'Type',
          'Quantity',
          'Price',
          'Currency',
          'Local Value',
          'Local Currency',
          'Value (EUR)',
          'Exchange Rate',
          'Transaction Costs',
          'Costs Currency',
          'Total',
          'Total Currency'
        ].join(','),
        ...transactions.map(tx => [
          tx.date,
          tx.time,
          tx.symbol,
          tx.isin,
          tx.exchange,
          tx.quantity > 0 ? 'BUY' : 'SELL',
          Math.abs(tx.quantity),
          tx.price.toFixed(4),
          tx.priceCurrency,
          tx.localValue.toFixed(2),
          tx.localCurrency,
          tx.valueEUR.toFixed(2),
          tx.exchangeRate.toFixed(4),
          tx.transactionCosts.toFixed(2),
          tx.costsCurrency,
          tx.total.toFixed(2),
          tx.totalCurrency
        ].join(','))
      ].join('\n');
    } else {
      csvContent = [
        [
          'Product',
          'ISIN',
          'Purchase Date',
          'Sale Date',
          'Quantity',
          'Bought Amount',
          'Bought Currency',
          'Sold Amount',
          'Sold Currency',
          'Profit (EUR)',
          'Transaction Costs (EUR)'
        ].join(','),
        ...filteredGains.map(gain => [
          gain.symbol,
          gain.isin,
          gain.purchaseDate,
          gain.saleDate,
          gain.quantity,
          gain.boughtAmount.toFixed(2),
          gain.boughtCurrency,
          gain.soldAmount.toFixed(2),
          gain.soldCurrency,
          gain.profitInEUR.toFixed(2),
          gain.transactionCosts.toFixed(2)
        ].join(','))
      ].join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeView === 'transactions' ? 'transactions' : 'capital_gains'}.csv`;
    link.click();
  };

  const handleExcelDownload = () => {
    const workbook = XLSX.utils.book_new();

    if (activeView === 'transactions') {
      const worksheet = XLSX.utils.json_to_sheet(
        transactions.map(tx => ({
          Date: tx.date,
          Time: tx.time,
          Symbol: tx.symbol,
          ISIN: tx.isin,
          Exchange: tx.exchange,
          Type: tx.quantity > 0 ? 'BUY' : 'SELL',
          Quantity: Math.abs(tx.quantity),
          Price: tx.price,
          Currency: tx.priceCurrency,
          'Local Value': tx.localValue,
          'Local Currency': tx.localCurrency,
          'Value (EUR)': tx.valueEUR,
          'Exchange Rate': tx.exchangeRate,
          'Transaction Costs': tx.transactionCosts,
          'Costs Currency': tx.costsCurrency,
          Total: tx.total,
          'Total Currency': tx.totalCurrency
        }))
      );
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    } else {
      const worksheet = XLSX.utils.json_to_sheet(
        filteredGains.map(gain => ({
          Product: gain.symbol,
          ISIN: gain.isin,
          'Purchase Date': gain.purchaseDate,
          'Sale Date': gain.saleDate,
          Quantity: gain.quantity,
          'Bought Amount': Number(gain.boughtAmount.toFixed(2)),
          'Bought Currency': gain.boughtCurrency,
          'Sold Amount': Number(gain.soldAmount.toFixed(2)),
          'Sold Currency': gain.soldCurrency,
          'Profit (EUR)': Number(gain.profitInEUR.toFixed(2)),
          'Transaction Costs (EUR)': Number(gain.transactionCosts.toFixed(2))
        }))
      );
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Capital Gains');
    }

    XLSX.writeFile(workbook, `${activeView === 'transactions' ? 'transactions' : 'capital_gains'}.xlsx`);
  };

  const handleIRSUpload = (xmlDoc: Document) => {
    try {
      // Find the Anexo J element
      const anexoJ = xmlDoc.querySelector('AnexoJ');
      if (anexoJ) {
        // Set the uploaded XML document
        setUploadedXmlDoc(xmlDoc);
        // Find all Quadro elements within Anexo J that are numbered 04 or higher
        const quadros = Array.from(anexoJ.querySelectorAll('[id^="Quadro"]'))
          .filter(quadro => {
            const quadroNumber = quadro.getAttribute('id')?.match(/\d+/)?.[0];
            return quadroNumber && parseInt(quadroNumber) >= 4;
          });

        quadros.forEach(quadro => {
          // Remove all child nodes while preserving attributes
          while (quadro.firstChild) {
            quadro.removeChild(quadro.firstChild);
          }
        });

        // Create a new serializer with pretty print options
        const serializer = new XMLSerializer();
        const xmlString = serializer.serializeToString(xmlDoc);
        
        // Format the XML string with proper indentation and line breaks
        const formattedXml = xmlString
          .replace(/></g, '>\n<')  // Add line breaks between tags
          .replace(/\n<(\/?[a-zA-Z])/g, '\n  <$1');  // Add indentation

        
        
        // Do not set modifiedIRSXml here
        console.log('IRS XML file uploaded successfully');
      } else {
        console.warn('No AnexoJ element found in the XML');
      }
    } catch (error) {
      console.error('Error processing XML:', error);
    }
    setShowIRSUpload(false);
  };

  const handleShowCSVUpload = () => {
    setShowIRSUpload(false);  // Close IRS upload if open
    setShowCSVUpload(true);
  };

  const handleShowIRSUpload = () => {
    setShowCSVUpload(false);  // Close CSV upload if open
    setShowIRSUpload(true);
  };

  const createAnexoJXML = (): void => {
    const builder = new Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' }
    });

    const anexoJq092AT01Linhas: Array<{ $: { numero: string }; NLinha: number; CodPais: number; Codigo: string; AnoRealizacao: number; MesRealizacao: number; DiaRealizacao: number; AnoAquisicao: number; MesAquisicao: number; DiaAquisicao: number; ValorRealizacao: number; ValorAquisicao: number; DespesasEncargos: string; }> = [];

    filteredGains.forEach((gain, index) => {
      const lineNumber = 951 + index;
      const numero = 1 + index;
      const saleDate = new Date(gain.saleDate);
      const purchaseDate = new Date(gain.purchaseDate);

      // Get the first two letters of the ISIN
      const isoCode = gain.isin.slice(0, 2);
      const codPais = Number(countryCodes[isoCode]) || 0; // Ensure it's a number, default to 0 if not found

      anexoJq092AT01Linhas.push({
        $: { numero: String(numero) },
        NLinha: lineNumber,
        CodPais: codPais,
        Codigo: 'G01',
        AnoRealizacao: saleDate.getFullYear(),
        MesRealizacao: saleDate.getMonth() + 1,
        DiaRealizacao: saleDate.getDate(),
        ValorRealizacao: gain.soldAmount,
        AnoAquisicao: purchaseDate.getFullYear(),
        MesAquisicao: purchaseDate.getMonth() + 1,
        DiaAquisicao: purchaseDate.getDate(),
        ValorAquisicao: gain.boughtAmount,
        DespesasEncargos: Math.abs(gain.transactionCosts).toFixed(2)
      });
    });

    const xml = builder.buildObject({
      AnexoJq092AT01: {
        'AnexoJq092AT01-Linha': anexoJq092AT01Linhas
      }
    });
    setModifiedIRSXml(xml); // Set modifiedIRSXml here
    console.log('Generated Anexo J XML:', xml);
  };

  useEffect(() => {
    if (activeView === 'gains') {
      createAnexoJXML();
    }
  }, [activeView, fromDate, toDate, gains]);

  const handleXMLExport = () => {
    if (uploadedXmlDoc && modifiedIRSXml) {
        // Parse the generated XML from the capital gains view
        const parser = new DOMParser();
        const modifiedXmlDoc = parser.parseFromString(modifiedIRSXml, 'text/xml');

        // Calculate sums for AnexoJq092AT01SomaC01, AnexoJq092AT01SomaC02, AnexoJq092AT01SomaC03
        const totalSaleAmount = filteredGains.reduce((sum, gain) => sum + Math.abs(gain.soldAmount), 0);
        const totalPurchaseAmount = filteredGains.reduce((sum, gain) => sum + Math.abs(gain.boughtAmount), 0);
        const totalTransactionCosts = filteredGains.reduce((sum, gain) => sum + Math.abs(gain.transactionCosts), 0);

        // Find the existing AnexoJq092AT01 element in the uploaded XML
        const existingAnexoJ = uploadedXmlDoc.querySelector('AnexoJq092AT01');

        if (existingAnexoJ && existingAnexoJ.parentNode) {
            // Replace the existing AnexoJq092AT01 with the modified one
            existingAnexoJ.parentNode.replaceChild(modifiedXmlDoc.documentElement, existingAnexoJ);
            
            //existingAnexoJ.removeAttribute('xmlns');

            // Update the existing sums in the XML
            const somaC01 = uploadedXmlDoc.querySelector('AnexoJq092AT01SomaC01');
            if (somaC01) {
                somaC01.textContent = totalSaleAmount.toFixed(2);
            }

            const somaC02 = uploadedXmlDoc.querySelector('AnexoJq092AT01SomaC02');
            if (somaC02) {
                somaC02.textContent = totalPurchaseAmount.toFixed(2);
            }

            const somaC03 = uploadedXmlDoc.querySelector('AnexoJq092AT01SomaC03');
            if (somaC03) {
                somaC03.textContent = totalTransactionCosts.toFixed(2);
            }
            
            // Serialize the modified XML back to a string
            const updatedXmlString = new XMLSerializer().serializeToString(uploadedXmlDoc).replace(' xmlns=""', '');
            
            
            // Create a Blob and trigger the download
            const blob = new Blob([updatedXmlString], { type: 'application/xml;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'updated_taxify_report.xml';
            link.click();
        } else {
            console.error('AnexoJq092AT01 element not found in uploaded XML.');
        }
    } else {
        console.error('uploadedXmlDoc or modifiedIRSXml is null');
    }
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>Trading Report</h2>
        {gains.length > 0 && activeView === 'gains' && (
          <div className="total-gain">
            Total Net Gain: <span className={totalNetGainEUR >= 0 ? 'positive' : 'negative'}>
              €{totalNetGainEUR.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <div className="upload-buttons">
        <div>
          <button onClick={handleShowCSVUpload}>Upload CSV</button>
          <button onClick={handleShowIRSUpload}>Upload IRS XML</button>
        </div>
      </div>

      {showCSVUpload && (
        <FileUpload onFileUpload={(transactions) => {
          onFileUpload(transactions);
          setShowCSVUpload(false);
        }} />
      )}

      {showIRSUpload && (
        <IRSUpload onFileUpload={(doc) => {
          handleIRSUpload(doc);
          setShowIRSUpload(false);
        }} />
      )}

      <div className="tabs">
        {gains.length > 0 && (
          <button
            className={`tab ${activeView === 'gains' ? 'active' : ''}`}
            onClick={() => setActiveView('gains')}
          >
            Capital Gains
          </button>
        )}
        <button
          className={`tab ${activeView === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveView('transactions')}
        >
          Transactions
        </button>
      </div>

      <div className="export-buttons">
        <div>
          <button onClick={handleCSVDownload}>Download CSV</button>
          <button onClick={handleExcelDownload}>Download Excel</button>
          <button onClick={handleXMLExport} disabled={!uploadedXmlDoc}>Export XML</button>
        </div>
        {activeView === 'gains' && (
          <div className="date-filters">
            <div className="date-filter">
              <label>From Date</label>
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => handleDateChange('from', e.target.value)}
              />
            </div>
            <div className="date-filter">
              <label>To Date</label>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => handleDateChange('to', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {activeView === 'transactions' && (
        <div className="results-table">
          <div className="table-wrapper">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Symbol</th>
                  <th>ISIN</th>
                  <th>Exchange</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Value</th>
                  <th>Exchange Rate</th>
                  <th>Costs</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, index) => (
                  <tr key={index} className={tx.quantity > 0 ? 'buy' : 'sell'}>
                    <td>{tx.date}</td>
                    <td>{tx.time}</td>
                    <td>{tx.symbol}</td>
                    <td>{tx.isin}</td>
                    <td>{tx.exchange}</td>
                    <td>{tx.quantity > 0 ? 'BUY' : 'SELL'}</td>
                    <td>{Math.abs(tx.quantity)}</td>
                    <td data-currency={tx.priceCurrency}>{tx.price.toFixed(4)}</td>
                    <td data-currency="EUR">{tx.valueEUR.toFixed(2)}</td>
                    <td>{tx.exchangeRate.toFixed(4)}</td>
                    <td data-currency={tx.costsCurrency}>{tx.transactionCosts.toFixed(2)}</td>
                    <td data-currency={tx.totalCurrency}>{tx.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'gains' && gains.length > 0 && (
        <div className="results-table">
          <div className="table-wrapper">
            <table className="capital-gains-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>ISIN</th>
                  <th>Purchase Date</th>
                  <th>Sale Date</th>
                  <th>Quantity</th>
                  <th>Bought Amount</th>
                  <th>Sold Amount</th>
                  <th>Profit</th>
                  <th>Costs</th>
                </tr>
              </thead>
              <tbody>
                {filteredGains.map((gain, index) => (
                  <tr key={index}>
                    <td>{gain.symbol}</td>
                    <td>{gain.isin}</td>
                    <td>{gain.purchaseDate}</td>
                    <td>{gain.saleDate}</td>
                    <td>{gain.quantity}</td>
                    <td data-currency="EUR">{gain.boughtAmount.toFixed(2)}</td>
                    <td data-currency="EUR">{gain.soldAmount.toFixed(2)}</td>
                    <td data-currency="EUR" className={gain.profitInEUR >= 0 ? 'positive' : 'negative'}>
                      {gain.profitInEUR.toFixed(2)}
                    </td>
                    <td data-currency="EUR">{gain.transactionCosts.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}; 