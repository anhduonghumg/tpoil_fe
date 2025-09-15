import { useMemo, useState } from 'react'
import { Button, Card, Col, Input, Row, Select, Space, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useUsers, useDepartments } from '../hooks'
import type { User } from '../types'

export default function UsersList() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [dept, setDept] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)

  const filters = useMemo(() => ({ q, deptId: dept, status, page, size }), [q, dept, status, page, size])
  const { data, isLoading } = useUsers(filters)
  const depts = useDepartments()

  const columns = [
    {
      title: 'Nhân viên',
      dataIndex: 'name',
      render: (_: any, r: User) => (
        <Space direction="vertical" size={0}>
          <a onClick={() => nav(`/users/${r.id}`)}>{r.name}</a>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Typography.Text>
        </Space>
      ),
    },
    { title: 'Điện thoại', dataIndex: 'phone', width: 140 },
    { title: 'Phòng ban', dataIndex: 'departmentName', width: 160 },
    { title: 'Chức danh', dataIndex: 'title', width: 160 },
    {
      title: 'Mốc thời gian',
      key: 'milestones',
      render: (_: any, r: User) => (
        <Typography.Text>
          {r.joinedAt} → {r.leftAt ? r.leftAt : 'nay'}
        </Typography.Text>
      ),
      width: 200,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 120,
      render: (v: User['status']) => {
        const color: any = { active: 'green', probation: 'blue', inactive: 'default', quit: 'red' }[v] || 'default'
        const text: any = { active: 'Đang làm', probation: 'Thử việc', inactive: 'Tạm dừng', quit: 'Nghỉ việc' }[v] || v
        return <Tag color={color}>{text}</Tag>
      },
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8}>
            <Input placeholder="Tìm theo tên, email, mã NV…" allowClear value={q} onChange={e=>{setQ(e.target.value); setPage(1)}} />
          </Col>
          <Col xs={12} md={6}>
            <Select
              allowClear
              placeholder="Phòng ban"
              style={{ width: '100%' }}
              loading={depts.isLoading}
              options={(depts.data||[]).map(d => ({ value: d.id, label: d.name }))}
              value={dept}
              onChange={(v)=>{setDept(v); setPage(1)}}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              allowClear
              placeholder="Trạng thái"
              style={{ width: '100%' }}
              options={[
                { value: 'active', label: 'Đang làm' },
                { value: 'probation', label: 'Thử việc' },
                { value: 'inactive', label: 'Tạm dừng' },
                { value: 'quit', label: 'Nghỉ việc' },
              ]}
              value={status}
              onChange={(v)=>{setStatus(v); setPage(1)}}
            />
          </Col>
          <Col xs={24} md={4} style={{ textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={()=>nav('/users/new')}>Thêm nhân viên</Button>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={data?.items || []}
          columns={columns as any}
          pagination={{
            current: page,
            pageSize: size,
            total: data?.total || 0,
            onChange: (p, s) => { setPage(p); setSize(s) },
            showSizeChanger: true,
          }}
          size="middle"
        />
      </Card>
    </Space>
  )
}
