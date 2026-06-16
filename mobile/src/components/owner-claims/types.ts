export type ClaimHistory = {
  oldStatus: string;
  newStatus: string;
  comment?: string;
  photoUrl?: string;
  changedAt: string;
};

export type Claim = {
  id: string;
  title?: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  tenant: {
    name: string;
    contract: { property: { name?: string; address: string } };
  };
  history: ClaimHistory[];
};

export type PhotoAsset = { uri: string; name: string; type: string };
