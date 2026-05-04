import calendar from '../assets/calendar.svg?raw'
import hamburger from '../assets/hamburger.svg?raw'
import todo from '../assets/todo.svg?raw'
import shopping from '../assets/shopping.svg?raw'

const icons = {
  calendar,
  hamburger,
  todo,
  shopping,
} as const

type IconName = keyof typeof icons

interface IconProps {
  name: IconName
  className?: string
}

const Icon = ({ name, className }: IconProps) => (
  <span
    className={className}
    style={{ width: '1em', height: '1em', display: 'inline-flex' }}
    dangerouslySetInnerHTML={{ __html: icons[name] }}
  />
)

export type { IconName }
export default Icon
