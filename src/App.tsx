import { useState } from 'react'
import { FileUpload } from './components/FileUpload'
import { Results } from './components/Results'
import { calculateCapitalGains } from './utils/capitalGains'
import { Transaction, CapitalGain } from './types'
import * as XLSX from 'xlsx';
import { Builder } from 'xml2js';
import './App.css'

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [gains, setGains] = useState<CapitalGain[]>([]);
  const [hasData, setHasData] = useState(false);

  const handleFileUpload = (newTransactions: Transaction[]) => {
    console.log('Received transactions:', newTransactions);
    setTransactions(newTransactions);
    const calculatedGains = calculateCapitalGains(newTransactions);
    console.log('Calculated gains:', calculatedGains);
    setGains(calculatedGains);
    setHasData(true);
  };

  return (
    <div className="app">
      <header>
        <h1>Taxify</h1>
        <p>Calculate your capital gains from trading transactions</p>
      </header>

      <main>
        {hasData ? (
          <Results
            transactions={transactions}
            gains={gains}
            onFileUpload={handleFileUpload}
            onDownloadCSV={() => {}}
            onDownloadExcel={() => {}}
            onExportXML={() => {}}
          />
        ) : (
          <div className="initial-upload">
            <FileUpload onFileUpload={handleFileUpload} />
          </div>
        )}
      </main>

      <footer>
        <p>
          Upload your trading platform export CSV file to calculate capital gains.
          Supports multiple currencies and includes transaction costs.
        </p>
      </footer>
    </div>
  )
}

export default App
