import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './Layout'
import { Loading } from './Mascot'
import { Protected } from './Protected'
import Home from './Home'
import ClassPage from './ClassPage'
import Subjects from './Subjects'
import Library from './Library'
import BookDetail from './BookDetail'
import RequestBook from './RequestBook'
import { About, Contact, Privacy, Terms } from './StaticPages'
import NotFound from './NotFound'
import AdminLogin from './AdminLogin'

const AdminDashboard = lazy(() => import('./AdminDashboard'))

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="class/:classId" element={<ClassPage />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="library" element={<Library />} />
          <Route path="book/:id" element={<BookDetail />} />
          <Route path="request" element={<RequestBook />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="admin/login" element={<AdminLogin />} />
          <Route path="admin" element={<Protected><AdminDashboard /></Protected>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
