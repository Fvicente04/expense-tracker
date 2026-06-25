export interface CategoryRule {
  id: string;
  userId: string;
  keyword: string;
  categoryId: string;
  category: { id: string; name: string; color: string };
  createdAt: string;
}

export interface CreateCategoryRuleRequest {
  keyword: string;
  categoryId: string;
}
