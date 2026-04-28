'use client'

import { useState, useEffect, useCallback } from 'react'

interface Slide {
  image: string
  badge: string
  title: string
  subtitle: string
}

const SLIDES: Slide[] = [
  {
    image: '/LINGKUNGAN-SEKOLAH-1.png',
    badge: 'LINGKUNGAN',
    title: 'Lingkungan Sekolah yang Asri',
    subtitle: 'SMA Antartika Sidoarjo — tempat terbaik untuk bertumbuh dan berkembang',
  },
  {
    image: '/FASILITAS-SEKOLAH.png',
    badge: 'FASILITAS',
    title: 'Fasilitas Lengkap & Modern',
    subtitle: 'Ruang belajar, perpustakaan, dan laboratorium yang mendukung proses pendidikan',
  },
  {
    image: '/PRESTASI-1.png',
    badge: 'PRESTASI',
    title: 'Berprestasi di Bidang Olahraga',
    subtitle: 'Futsal, karate, dan berbagai kompetisi olahraga tingkat Jawa Timur & Nasional',
  },
  {
    image: '/PRESTASI-2.png',
    badge: 'PRESTASI',
    title: 'Unggul dalam Akademik & Seni',
    subtitle: 'Paskibraka, lomba seni, olahraga dayung, hingga Duta Pariwisata Jawa Timur',
  },
]

const ACTIVE_SLIDES = SLIDES

export default function BannerSlider() {
  const [current, setCurrent] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const goTo = useCallback((index: number) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrent(index)
      setIsTransitioning(false)
    }, 300)
  }, [isTransitioning])

  const goNext = useCallback(() => {
    goTo((current + 1) % ACTIVE_SLIDES.length)
  }, [current, goTo])

  const goPrev = useCallback(() => {
    goTo((current - 1 + ACTIVE_SLIDES.length) % ACTIVE_SLIDES.length)
  }, [current, goTo])

  // Auto-play setiap 10 detik
  useEffect(() => {
    const timer = setInterval(goNext, 10000)
    return () => clearInterval(timer)
  }, [goNext])

  const slide = ACTIVE_SLIDES[current]

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Foto */}
      <img
        key={current}
        src={slide.image}
        alt={slide.title}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {/* Konten bawah */}
      <div className="absolute bottom-10 left-8 right-8">
        <span className="inline-block rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white border border-white/30 mb-3">
          {slide.badge}
        </span>
        <h2
          className={`text-3xl font-bold text-white mb-2 transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {slide.title}
        </h2>
        <p
          className={`text-sm text-white/80 transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {slide.subtitle}
        </p>
      </div>

      {/* Tombol navigasi */}
      <button
        type="button"
        onClick={goPrev}
        className="absolute bottom-8 right-16 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-colors"
        aria-label="Slide sebelumnya"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={goNext}
        className="absolute bottom-8 right-6 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-colors"
        aria-label="Slide berikutnya"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dots indikator */}
      <div className="absolute bottom-4 left-8 flex gap-1.5">
        {ACTIVE_SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? 'h-1.5 w-6 bg-white'
                : 'h-1.5 w-1.5 bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
