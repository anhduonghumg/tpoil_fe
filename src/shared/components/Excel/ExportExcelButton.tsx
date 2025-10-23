// shared/components/ExportExcelButton.tsx
import { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Modal,
  Radio,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Flex,
} from "antd";
import {
  DownloadOutlined,
  CheckSquareOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { ExportColumn } from "../../lib/exportExcel";
import { exportExcelStyled } from "../../utils/exportExcelExcelJS";

type Props<T = any> = {
  allColumns: ExportColumn<T>[];
  fetchAll?: () => Promise<T[]>;
  currentRows?: T[];
  filename?: string;
  defaultSelectedKeys?: Array<string | keyof T>;
  gridCols?: 2 | 3 | 4;
};

export default function ExportExcelButton<T = any>({
  allColumns,
  fetchAll,
  currentRows = [],
  filename = "data",
  defaultSelectedKeys,
  gridCols = 3,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const defaultSel = useMemo(
    () => defaultSelectedKeys ?? allColumns.map((c) => c.key),
    [allColumns, defaultSelectedKeys]
  );
  const [selected, setSelected] = useState<(string | keyof T)[]>(defaultSel);
  const [scope, setScope] = useState<"page" | "all">(fetchAll ? "all" : "page");
  const [loading, setLoading] = useState(false);

  const allKeys = useMemo(() => allColumns.map((c) => c.key), [allColumns]);
  const allChecked = selected.length === allKeys.length && allKeys.length > 0;
  const indeterminate = selected.length > 0 && selected.length < allKeys.length;
  const handleSelectAll = () => setSelected(allKeys);
  const handleClear = () => setSelected([]);
  const handleToggleAll = () =>
    allChecked ? handleClear() : handleSelectAll();

  const colSpan = useMemo(() => {
    switch (gridCols) {
      case 4:
        return { xs: 24, sm: 12, md: 12, lg: 6 };
      case 2:
        return { xs: 24, sm: 12, md: 12, lg: 12 };
      default:
        return { xs: 24, sm: 12, md: 8, lg: 8 };
    }
  }, [gridCols]);

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = scope === "all" && fetchAll ? await fetchAll() : currentRows;
      const cols = allColumns.filter((c) => selected.includes(c.key));
      await exportExcelStyled<T>(data, cols, filename, {
        title: "Danh sách nhân viên",
        sheetName: "Employees",
        autoFit: true,
        headerFill: "F2F3F5",
        border: true,
      });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button size="small" icon={<DownloadOutlined />} onClick={() => setOpen(true)}>
        Xuất Excel
      </Button>
      <Modal
        title="Xuất danh sách nhân viên"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleExport}
        okText="Xuất"
        cancelText="Hủy"
        confirmLoading={loading}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={8}>
            <Typography.Text strong>Chọn cột</Typography.Text>
            <Space size={8} wrap>
              <Checkbox
                indeterminate={indeterminate}
                checked={allChecked}
                onChange={handleToggleAll}
              >
                {allChecked ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </Checkbox>
              <Button
                size="small"
                icon={<CheckSquareOutlined />}
                onClick={handleSelectAll}
              >
                Chọn tất cả
              </Button>
              <Button
                size="small"
                icon={<StopOutlined />}
                onClick={handleClear}
              >
                Bỏ chọn
              </Button>
            </Space>
          </Flex>

          <div
            style={{
              padding: 12,
              border: "1px solid #f0f0f0",
              borderRadius: 8,
              background: "#fafafa",
            }}
          >
            <Row gutter={[8, 8]}>
              {allColumns.map((c) => (
                <Col key={String(c.key)} {...colSpan}>
                  <Checkbox
                    checked={selected.includes(c.key)}
                    onChange={(e) =>
                      setSelected((cur) =>
                        e.target.checked
                          ? [...cur, c.key]
                          : cur.filter((k) => k !== c.key)
                      )
                    }
                  >
                    {c.label}
                  </Checkbox>
                </Col>
              ))}
            </Row>
          </div>

          {fetchAll && (
            <>
              <Divider style={{ margin: "8px 0" }} />
              <div>
                <Typography.Text strong>Phạm vi</Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <Radio.Group
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                  >
                    <Radio value="page">Trang hiện tại</Radio>
                    <Radio value="all">Tất cả</Radio>
                  </Radio.Group>
                </div>
              </div>
            </>
          )}
        </Space>
      </Modal>
    </>
  );
}
