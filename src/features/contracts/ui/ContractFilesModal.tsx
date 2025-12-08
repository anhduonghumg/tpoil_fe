// features/contracts/ui/ContractFilesModal.tsx
import React from "react";
import { List, Spin, Tag } from "antd";
import { useContractDetail } from "../hooks";
import CommonModal from "../../../shared/ui/CommonModal";

interface ContractFilesModalProps {
  contractId?: string | null;
  open: boolean;
  onClose: () => void;
}

export const ContractFilesModal: React.FC<ContractFilesModalProps> = ({
  contractId,
  open,
  onClose,
}) => {
  // Chỉ load khi modal mở & có contractId
  const { data, isLoading } = useContractDetail(open ? contractId : undefined);

  const attachments = (data as any)?.attachments ?? [];

  return (
    <CommonModal
      title="File đính kèm hợp đồng"
      open={open}
      onCancel={onClose}
      footer={null}
      size="md"
      maskClosable={true}
    >
      {isLoading ? (
        <div
          style={{
            minHeight: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Spin />
        </div>
      ) : !attachments.length ? (
        <div>Không có file đính kèm.</div>
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={attachments}
          renderItem={(item: any) => {
            const handleClick = () => {
              if (item.fileUrl) {
                window.open(item.fileUrl, "_blank", "noopener,noreferrer");
              } else if (item.externalUrl) {
                window.open(item.externalUrl, "_blank", "noopener,noreferrer");
              }
            };

            return (
              <List.Item
                key={item.id}
                style={{ cursor: "pointer" }}
                onClick={handleClick}
              >
                <List.Item.Meta
                  title={
                    <span>
                      {item.fileName || "File không tên"}{" "}
                      {item.category && (
                        <Tag color="blue" style={{ marginLeft: 4 }}>
                          {item.category}
                        </Tag>
                      )}
                    </span>
                  }
                  description={
                    item.externalUrl
                      ? `Nguồn ngoài: ${item.externalUrl}`
                      : item.fileUrl
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
    </CommonModal>
  );
};

export default ContractFilesModal;
