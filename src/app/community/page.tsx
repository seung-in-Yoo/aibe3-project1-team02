'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { supabase } from '@/lib/supabase'
import { Review } from '@/types/community'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import CommunityCard from '@/components/CommunityCard'

export default function CommunityPage() {
    const [activeTab, setActiveTab] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [posts, setPosts] = useState<Review[]>([])
    const [currentUserId, setCurrentUserId] = useState<number | null>(null)
    const router = useRouter()

    const tabs = [
        { id: 'all', name: '전체', icon: 'ri-global-line' },
        { id: 'review', name: '여행후기', icon: 'ri-star-line' },
        { id: 'question', name: '질문/답변', icon: 'ri-question-line' },
        { id: 'tip', name: '여행팁', icon: 'ri-lightbulb-line' },
        { id: 'companion', name: '동행구인', icon: 'ri-group-line' },
    ]

    const getCurrentUser = async () => {
        const {
            data: { user },
        } = await supabaseBrowser.auth.getUser()
        return user
    }

    const getUserId = async (authId: string) => {
        const { data, error } = await supabase.from('user').select('id').eq('auth_id', authId).single()
        if (error) throw error
        return data.id
    }

    const getPosts = async () => {
        const { data, error } = await supabase
            .from('review')
            .select(
                `
                *,
                user: user(profile_image),
                review_tag:review_tag (
            name
          )
            `,
            )
            .order('id', { ascending: false })

        if (error) throw error
        return data
    }

    const fetchData = async () => {
        try {
            const user = await getCurrentUser()
            if (!user) return router.push('/login')

            const userId = await getUserId(user.id)
            setCurrentUserId(userId)

            const posts = await getPosts()
            setPosts(posts || [])
        } catch (err) {
            console.error('초기화 실패:', err)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleDelete = async (post: Review, postId: number) => {
        const { error: commentError } = await supabase.from('review_comments').delete().eq('review_id', postId)

        if (commentError) {
            console.error('댓글 삭제 실패:', commentError)
            return
        }

        const { error: tagError } = await supabase.from('review_tag').delete().eq('review_id', postId)

        if (tagError) {
            console.error('태그 삭제 실패:', tagError)
            return
        }

        const { error: likeError } = await supabase.from('likes').delete().eq('target_id', postId)

        if (likeError) {
            console.error('좋아요 삭제 실패:', likeError)
        }

        const { error: removeError } = await supabase.storage.from('review-images').remove([post.file_path])

        if (removeError) console.error('스토리지 파일 삭제 실패:', removeError)

        const { error: reviewError } = await supabase.from('review').delete().eq('id', postId)

        if (reviewError) {
            console.error('삭제 실패:', reviewError)
            alert('후기 삭제에 실패했습니다.')
        } else {
            alert('후기 삭제 완료!')
            fetchData()
        }
    }

    const filteredPosts = posts.filter((post) => {
        const matchesTab = activeTab === 'all' || post.type === activeTab
        const matchesSearch =
            post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.location.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesTab && matchesSearch
    })

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">커뮤니티</h1>
                    <p className="text-xl text-blue-100">여행자들과 소중한 경험을 나누어보세요</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8">
                    <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                        <div className="flex-1">
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                                    <i className="ri-search-line text-gray-400 text-sm"></i>
                                </div>
                                <input
                                    type="text"
                                    placeholder="궁금한 여행지나 키워드를 검색해보세요"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/community/new')}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap font-medium"
                        >
                            글쓰기
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                <div className="w-4 h-4 flex items-center justify-center">
                                    <i className={`${tab.icon} text-sm`}></i>
                                </div>
                                {tab.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    {filteredPosts.map((post) => (
                        <CommunityCard
                            key={post.id}
                            post={post}
                            currentUserId={currentUserId}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <button className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer whitespace-nowrap">
                        더 많은 글 보기
                    </button>
                </div>
            </div>

            <Footer />
        </div>
    )
}
