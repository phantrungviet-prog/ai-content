// Shared shape of an editable menu, used by the editor, the AI extractor and the public page.
export type MenuOption = { label: string; price: number | null };

export type MenuItemDraft = {
  name: string;
  description: string;
  price: number | null;
  options: MenuOption[];
  is_available: boolean;
};

export type MenuCategoryDraft = { name: string; items: MenuItemDraft[] };

export type MenuDraft = { title: string; categories: MenuCategoryDraft[] };
