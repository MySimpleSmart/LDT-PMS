import { Avatar } from 'antd'
import { getAvatarUrl, getDefaultAvatarUrl } from '../constants/avatars'

interface MemberAvatarProps {
  profileImage: string | null
  firstName: string
  lastName: string
  size?: number
  style?: React.CSSProperties
}

/** Shows profile image from avatars folder, or default avatar image when none set. */
export default function MemberAvatar({ profileImage, firstName, lastName, size = 120, style }: MemberAvatarProps) {
  const src = profileImage
    ? (profileImage.startsWith('http') || profileImage.startsWith('/') ? profileImage : getAvatarUrl(profileImage))
    : getDefaultAvatarUrl()
  return <Avatar size={size} src={src} style={style} />
}
