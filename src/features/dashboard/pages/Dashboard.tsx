import { Card, Col, Row, Typography, Space, Button, Table, Empty } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import './dashboard.css'

type Metric = { label: string; value: string; hint?: string }
const METRICS: Metric[] = [
  { label: 'Doanh thu hôm nay', value: '—', hint: 'đang chờ dữ liệu' },
  { label: 'Đơn hàng',         value: '—', hint: 'đang chờ dữ liệu' },
  { label: 'Khách mới',        value: '—', hint: 'đang chờ dữ liệu' },
  { label: 'Tồn kho cảnh báo', value: '—', hint: 'đang chờ dữ liệu' },
]

export default function Dashboard() {
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Tổng quan</Typography.Title>
        <Space>
          <Button icon={<PlusOutlined />}>Tạo đơn hàng</Button>
          <Button icon={<ReloadOutlined />}>Tải lại</Button>
        </Space>
      </Space>

      <Row gutter={[16, 16]}>
        {METRICS.map((m, i) => (
          <Col key={i} xs={24} sm={12} lg={6}>
            <Card className="kpi" bordered={false}>
              <Typography.Text type="secondary">{m.label}</Typography.Text>
              <Typography.Title level={3} style={{ margin: '4px 0 2px' }}>
                {m.value}
              </Typography.Title>
              <Typography.Text className="kpi-hint">{m.hint}</Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Đơn hàng gần đây" bordered={false}>
            <Table
              rowKey="id"
              size="small"
              dataSource={[]}
              pagination={{ pageSize: 5 }}
              locale={{ emptyText: <Empty description="Chưa có dữ liệu" /> }}
              columns={[
                { title: 'Mã đơn', dataIndex: 'code', width: 160 },
                { title: 'Khách hàng', dataIndex: 'customer' },
                { title: 'Ngày', dataIndex: 'date', width: 160 },
                { title: 'Tổng', dataIndex: 'total', align: 'right', width: 120 },
                { title: 'Trạng thái', dataIndex: 'status', width: 120 },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Tồn kho cảnh báo" bordered={false}>
            <Table
              rowKey="sku"
              size="small"
              dataSource={[]}
              pagination={false}
              locale={{ emptyText: <Empty description="Chưa có dữ liệu" /> }}
              columns={[
                { title: 'SKU', dataIndex: 'sku', width: 120 },
                { title: 'Sản phẩm', dataIndex: 'name' },
                { title: 'SL', dataIndex: 'qty', align: 'right', width: 80 },
                { title: 'Min', dataIndex: 'min', align: 'right', width: 80 },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
