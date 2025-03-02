export interface Transaction {
  date: string;
  time: string;
  symbol: string;
  isin: string;
  exchangeFrom: string;
  exchange: string;
  quantity: number;
  price: number;
  priceCurrency: string;
  localValue: number;
  localCurrency: string;
  valueEUR: number;
  exchangeRate: number;
  transactionCosts: number;
  costsCurrency: string;
  total: number;
  totalCurrency: string;
  orderId: string;
}

export interface CapitalGain {
  symbol: string;
  isin: string;
  purchaseDate: string;
  saleDate: string;
  quantity: number;
  boughtAmount: number;
  boughtCurrency: string;
  soldAmount: number;
  soldCurrency: string;
  profitInEUR: number;
  transactionCosts: number;
  exchangeRate: number;
}

export interface FileUploadProps {
  onFileUpload: (transactions: Transaction[]) => void;
}

export interface ResultsProps {
  transactions: Transaction[];
  gains: CapitalGain[];
  onFileUpload: (transactions: Transaction[]) => void;
  onDownloadCSV: () => void;
  onDownloadExcel: () => void;
  onExportXML: () => void;
}

export interface Quadro09 {
  NLinha: number;
  CodPais: number;
  Codigo: string;
  AnoRealizacao: number;
  MesRealizacao: number;
  DiaRealizacao: number;
  AnoAquisicao: number;
  MesAquisicao: number;
  DiaAquisicao: number;
  ValorRealizacao: number;
  ValorAquisicao: number;
  DespesasEncargos: number;
  numero: string;
}

export interface AnexoJ {
  Quadro09: Quadro09[];
} 