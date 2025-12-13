// import React, { useEffect, useMemo, useState } from "react";
// import { Modal, Select, Space, Tag } from "antd";
// import type { UserRow } from "../types";
// import { useRolesAll, useSetUserRoles } from "../hooks";

// type Props = {
//   open: boolean;
//   user: UserRow | null;
//   onClose: () => void;
//   onSuccess: () => void;
// };

// export function AssignRolesModal({ open, user, onClose, onSuccess }: Props) {
//   const { data } = useRolesAll();
//   const { mutateAsync, isPending } = useSetUserRoles();
//   const [roleIds, setRoleIds] = useState<string[]>([]);

//   useEffect(() => {
//     if (!open) return;
//     setRoleIds(user?.rolesGlobal?.map((r) => r.id) ?? []);
//   }, [open, user]);

//   const options = useMemo(() => {
//     const items = data?.items ?? [];
//     return items.map((r: any) => ({
//       label: `${r.name} (${r.code})`,
//       value: r.id,
//     }));
//   }, [data]);

//   return (
//     <Modal
//       open={open}
//       title={user ? `Gán quyền (global) - ${user.username}` : "Gán quyền"}
//       onCancel={onClose}
//       okText="Lưu"
//       cancelText="Huỷ"
//       confirmLoading={isPending}
//       onOk={async () => {
//         if (!user) return;
//         await mutateAsync({ id: user.id, roleIds });
//         onSuccess();
//       }}
//       destroyOnClose
//     >
//       <Space direction="vertical" style={{ width: "100%" }} size={12}>
//         <Select
//           mode="multiple"
//           style={{ width: "100%" }}
//           placeholder="Chọn role"
//           value={roleIds}
//           onChange={setRoleIds}
//           options={options}
//           optionFilterProp="label"
//         />

//         <div style={{ opacity: 0.7, fontSize: 12 }}>
//           V1 chỉ áp dụng <b>global</b>. V2 sẽ mở rộng theo
//           site/department/employee.
//         </div>

//         {!!roleIds.length && (
//           <Space wrap>
//             {roleIds.map((id) => {
//               const r = (data?.items ?? []).find((x: any) => x.id === id);
//               return <Tag key={id}>{r?.name ?? id}</Tag>;
//             })}
//           </Space>
//         )}
//       </Space>
//     </Modal>
//   );
// }
