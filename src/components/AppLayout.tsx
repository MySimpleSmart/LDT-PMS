import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Typography, Dropdown, Space, Badge, Button, Modal } from 'antd'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  ProjectOutlined,
  CheckSquareOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  FolderOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  BookOutlined,
  ReadOutlined,
  DownOutlined,
  SettingOutlined,
} from '@ant-design/icons'

import { useAuth } from '../context/AuthContext'
import { useCurrentUser } from '../context/CurrentUserContext'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import MemberAvatar from './MemberAvatar'

const { Header, Sider, Content, Footer } = Layout

const routesForSuperAdmin: MenuProps['items'] = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  {
    key: 'project-sub',
    icon: <ProjectOutlined />,
    label: 'Project',
    children: [{ key: '/projects', label: 'All Projects' }],
  },
  { key: '/tasks', icon: <CheckSquareOutlined />, label: 'Tasks' },
  { key: '/members', icon: <TeamOutlined />, label: 'Members' },
  { key: '/admins', icon: <SafetyCertificateOutlined />, label: 'Admins' },
  { key: '/notes', icon: <FileTextOutlined />, label: 'Notes' },
  { key: '/files', icon: <FolderOutlined />, label: 'Files' },
  { key: '/courses', icon: <ReadOutlined />, label: 'Courses' },
]

const routesForProjectLead: MenuProps['items'] = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  {
    key: 'project-sub',
    icon: <ProjectOutlined />,
    label: 'Project',
    children: [
      { key: '/projects', label: 'All Projects' },
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
  const { signOut: authSignOut } = useAuth()
  const { currentAdmin, currentAdminId, currentMember, profilePath, displayName, setCurrentAdminId, isLoggedIn, isSuperAdmin, isProjectLead } = useCurrentUser()
  const canAccessDashboard = isSuperAdmin || isProjectLead
  const routes = isSuperAdmin ? routesForSuperAdmin : routesForProjectLead
  const { confirmNavigation } = useUnsavedChanges()
  const hasProfile = Boolean(currentAdminId || currentMember)

  const userMenuItems: MenuProps['items'] = [
    ...(hasProfile ? [{ key: 'profile', icon: <UserOutlined />, label: 'My profile' }] : []),
    ...(isSuperAdmin ? [{ key: 'settings', icon: <SettingOutlined />, label: 'System settings' }] : []),
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Log out', danger: true },
  ]

  const onUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'settings') {
      confirmNavigation('/settings/system', () => navigate('/settings/system'))
    } else if (key === 'profile' && hasProfile) {
      confirmNavigation(profilePath, () => navigate(profilePath))
    } else if (key === 'logout') {
      Modal.confirm({
        title: 'Log out?',
        content: 'Are you sure you want to log out?',
        okText: 'Log out',
        okButtonProps: { danger: true },
        cancelText: 'Cancel',
        onOk: () => {
          setCurrentAdminId(null)
          authSignOut().then(() => navigate('/login', { replace: true }))
        },
      })
    }
  }

  if (isLoggedIn && !canAccessDashboard) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#fafafa' }}>
          <Typography.Title level={3} style={{ marginBottom: 8 }}>No dashboard access</Typography.Title>
          <Typography.Text type="secondary" style={{ marginBottom: 24, textAlign: 'center', maxWidth: 400 }}>
            Your account does not have access to the project lead dashboard. Only Super Admin and project leads can use this area. Contact Super Admin if you need access.
          </Typography.Text>
          <Button
            type="primary"
            danger
            onClick={() => {
              Modal.confirm({
                title: 'Log out?',
                content: 'Are you sure you want to log out?',
                okText: 'Log out',
                okButtonProps: { danger: true },
                cancelText: 'Cancel',
                onOk: () => {
                  setCurrentAdminId(null)
                  authSignOut().then(() => navigate('/login', { replace: true }))
                },
              })
            }}
          >
            Log out
          </Button>
        </div>
      </Layout>
    )
  }

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
            gap: 10,
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <img
            src="/echo_logo.svg"
            alt="ECHO"
            style={{
              height: collapsed ? 28 : 36,
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
              flexShrink: 0,
            }}
          />
          {!collapsed && (
            <Typography.Text strong style={{ color: 'rgba(0,0,0,0.88)', fontSize: 18, letterSpacing: '0.02em' }}>
              ECHO
            </Typography.Text>
          )}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['project-sub']}
          items={routes as MenuProps['items']}
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
                  profileImage={currentAdmin?.profileImage ?? currentMember?.profileImage ?? null}
                  firstName={currentAdmin?.firstName ?? currentMember?.firstName ?? ''}
                  lastName={currentAdmin?.lastName ?? currentMember?.lastName ?? ''}
                  size={32}
                />
                <Typography.Text>{isLoggedIn ? displayName : 'Not logged in'}</Typography.Text>
                <DownOutlined style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }} />
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
        <Footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', color: 'rgba(0,0,0,0.45)', fontSize: 13, borderTop: '1px solid #f0f0f0', flexWrap: 'wrap', gap: 8 }}>
          <span>
            Developed by{' '}
            <a href="https://simplesmart.com.au/" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(0,0,0,0.65)' }}>
              SimpleSmart
            </a>
          </span>
          <span>All rights reserved ©{new Date().getFullYear()}.</span>
        </Footer>
      </Layout>
    </Layout>
  )
}
