import LoginForm from '@/components/auth/LoginForm'
import BannerSlider from '@/components/auth/BannerSlider'

export default function HomePage() {
  return (
    <div className="flex min-h-screen">
      {/* Kiri — slider foto gedung sekolah */}
      <div className="relative hidden lg:flex lg:w-3/5 flex-col">
        {/* Slider */}
        <BannerSlider />
      </div>

      {/* Kanan — panel login */}
      <div className="flex w-full lg:w-2/5 items-center justify-center bg-[#f5f0f0] px-8 py-12">
        <LoginForm />
      </div>
    </div>
  )
}
