import LoginForm from '@/components/auth/LoginForm'
import BannerSlider from '@/components/auth/BannerSlider'

export default function HomePage() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Kiri — slider foto gedung sekolah */}
      <div className="relative hidden lg:flex lg:w-3/5 flex-col">
        <BannerSlider />
      </div>

      {/* Kanan — panel login */}
      <div className="flex w-full lg:w-2/5 items-center justify-center bg-[#f5f0f0] px-8 overflow-y-auto">
        <LoginForm />
      </div>
    </div>
  )
}
