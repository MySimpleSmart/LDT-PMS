import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Typography, Dropdown, Space, Badge } from 'antd'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  ProjectOutlined,
  CheckSquareOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  FolderOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  BookOutlined,
  ReadOutlined,
} from '@ant-design/icons'

import { useCurrentUser } from '../context/CurrentUserContext'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import MemberAvatar from './MemberAvatar'

const { Header, Sider, Content } = Layout

const routes: MenuProps['items'] = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  {
    key: 'project-sub',
    icon: <ProjectOutlined />,
    label: 'Project',
    children: [
      { key: '/projects', label: 'All Projects' },
      { key: '/projects/categories', label: 'Project Categories' },
      { key: '/projects/tags', label: 'Project Tags' },
    ],
  },
  { key: '/tasks', icon: <CheckSquareOutlined />, label: 'Tasks' },
  { key: '/members', icon: <TeamOutlined />, label: 'Members' },
  { key: '/admins', icon: <SafetyCertificateOutlined />, label: 'Admins' },
  { key: '/notes', icon: <FileTextOutlined />, label: 'Notes' },
  { key: '/files', icon: <FolderOutlined />, label: 'Files' },
  { key: '/courses', icon: <ReadOutlined />, label: 'Courses' },
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { currentAdmin, currentAdminId, setCurrentAdminId, isLoggedIn } = useCurrentUser()
  const { confirmNavigation } = useUnsavedChanges()

  const userMenuItems: MenuProps['items'] = [
    ...(currentAdminId ? [{ key: 'profile', icon: <UserOutlined />, label: 'My profile' }] : []),
    { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Log out', danger: true },
  ]

  const onUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'profile' && currentAdminId) {
      confirmNavigation(`/admins/${currentAdminId}`, () => navigate(`/admins/${currentAdminId}`))
    } else if (key === 'settings') {
      confirmNavigation('/settings', () => navigate('/settings'))
    } else if (key === 'logout') {
      setCurrentAdminId(null)
      navigate('/')
    }
  }

  const displayName = currentAdmin ? `${currentAdmin.firstName} ${currentAdmin.lastName}` : 'User'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        width={240}
        collapsedWidth={72}
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <div
          style={{
            height: 56,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Typography.Text strong style={{ color: 'rgba(0,0,0,0.88)', fontSize: collapsed ? 14 : 16 }}>
            {collapsed ? 'EP' : 'ECHO PMS'}
          </Typography.Text>
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['project-sub']}
          items={routes}
          onClick={({ key }) => confirmNavigation(String(key), () => navigate(String(key)))}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            borderBottom: '1px solid #f0f0f0',
            height: 56,
          }}
        >
          {collapsed ? (
            <MenuUnfoldOutlined
              onClick={() => setCollapsed(false)}
              style={{ fontSize: 18, cursor: 'pointer', color: 'rgba(0,0,0,0.65)' }}
            />
          ) : (
            <MenuFoldOutlined
              onClick={() => setCollapsed(true)}
              style={{ fontSize: 18, cursor: 'pointer', color: 'rgba(0,0,0,0.65)' }}
            />
          )}
          <Typography.Text strong style={{ color: 'rgba(0,0,0,0.88)', fontSize: 15 }}>
            Project Management
          </Typography.Text>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{ fontSize: 18, color: 'rgba(0,0,0,0.65)', cursor: 'pointer', padding: 4, display: 'inline-flex' }}
              title="Documentation"
              onClick={() => window.open('/docs', '_blank')}
            >
              <BookOutlined />
            </span>
            <Badge count={0} size="small" offset={[-2, 2]}>
              <span
                style={{ fontSize: 18, color: 'rgba(0,0,0,0.65)', cursor: 'pointer', padding: 4, display: 'inline-flex' }}
                title="Notifications"
                onClick={() => {}}
              >
                <BellOutlined />
              </span>
            </Badge>
            <Dropdown menu={{ items: userMenuItems, onClick: onUserMenuClick }} trigger={['click']} placement="bottomRight">
              <Space style={{ cursor: 'pointer', marginLeft: 8 }}>
                <MemberAvatar
                  profileImage={currentAdmin?.profileImage ?? null}
                  firstName={currentAdmin?.firstName ?? ''}
                  lastName={currentAdmin?.lastName ?? ''}
                  size={32}
                />
                <Typography.Text>{isLoggedIn ? displayName : 'Not logged in'}</Typography.Text>
              </Space>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: '#fafafa',
            borderRadius: 8,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
