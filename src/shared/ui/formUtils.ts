// src/shared/ui/formUtils.ts
import type { FormInstance } from "antd";
import type { NamePath } from "antd/es/form/interface";

export type TabFormRef = {
  key: string;
  form: FormInstance;
  required?: boolean;
};

export function focusFirstError(
  tabKey: string,
  form: FormInstance,
  setActiveKey: (k: string) => void,
  errorFields?: { name: NamePath }[]
) {
  setActiveKey(tabKey);
  const first =
    (errorFields && errorFields[0]?.name) ||
    form.getFieldsError().find((e) => e.errors.length)?.name;
  if (first)
    setTimeout(() => form.scrollToField(first, { block: "center" }), 0);
}

export async function validateFormsSequential(
  tabForms: TabFormRef[],
  setActiveKey: (key: string) => void
): Promise<boolean> {
  const requiredForms = tabForms.filter((tab) => tab.required);

  for (const tabForm of requiredForms) {
    try {
      await tabForm.form.validateFields();
    } catch (errorInfo: any) {
      // Chuyển tab và focus vào field lỗi đầu tiên
      focusFirstError(
        tabForm.key,
        tabForm.form,
        setActiveKey,
        errorInfo?.errorFields
      );
      return false;
    }
  }

  return true;
}

/** Gộp values từ tất cả form (kể cả optional) */
export function collectFormsValues(tabForms: TabFormRef[]) {
  const result: Record<string, any> = {};

  for (const tabForm of tabForms) {
    try {
      result[tabForm.key] = tabForm.form.getFieldsValue();
    } catch (error) {
      result[tabForm.key] = {};
    }
  }

  return result;
}

export function resetAllForms(tabForms: TabFormRef[]) {
  tabForms.forEach((tabForm) => {
    try {
      tabForm.form.resetFields();
    } catch (error) {
      console.warn(`Failed to reset form ${tabForm.key}:`, error);
    }
  });
}
