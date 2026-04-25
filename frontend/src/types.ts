export type Theme = "light" | "dark";

export type PayoutState = "pending" | "processing" | "completed" | "failed";

export type LedgerKind = "credit" | "debit" | "refund";

export type SectionKey = "overview" | "payouts" | "ledger" | "banks";

export type BankAccount = {
  id: string;
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  is_active: boolean;
};

export type Merchant = {
  id: string;
  name: string;
  email: string;
  balance_paise: number;
  held_balance_paise: number;
  bank_accounts: BankAccount[];
  created_at: string;
};

export type Payout = {
  id: string;
  amount_paise: number;
  state: PayoutState;
  bank_account_id: string;
  idempotency_key: string;
  attempts: number;
  failure_reason: string;
  created_at: string;
  updated_at: string;
};

export type LedgerEntry = {
  id: string;
  kind: LedgerKind;
  amount_paise: number;
  description: string;
  payout_id: string | null;
  created_at: string;
};

export type LedgerEntryWithBalance = LedgerEntry & {
  running_balance_paise: number;
};

export type CreatePayoutPayload = {
  amount_paise: number;
  bank_account_id: string;
};

export type NavItem = {
  key: SectionKey;
  label: string;
  count?: number;
};
