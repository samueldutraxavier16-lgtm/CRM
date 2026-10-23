export type Stage = "Novo" | "Em contato" | "Proposta" | "Ganho" | "Perdido";
export type Priority = "Baixa" | "Normal" | "Alta" | "Urgente";
export type Opportunity = {
  id: string; company: string; contact: string; phone: string; email?: string;
  stage: Stage; amount: number; owner: string; ownerId?: string; createdAt: string;
  closeDate?: string; nextContactAt?: string; priority?: Priority; isSaved?: boolean; notes?: string;
};
export type Prospect = {
  id: string; name: string; category: "Hamburgueria" | "Barbearia" | "Lanchonete";
  phone: string; address: string; source: string; checkedAt: string; status: "Novo" | "Contatado";
};
