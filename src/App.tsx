import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import About from "./pages/About";
import Gallery from "./pages/Gallery";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Shared pages
import Profile from "./pages/Profile";
import ChangePassword from "./pages/ChangePassword";
import Messages from "./pages/Messages";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AcademicYearsManagement from "./pages/admin/AcademicYearsManagement";
import TeachersManagement from "./pages/admin/TeachersManagement";
import ClassesManagement from "./pages/admin/ClassesManagement";
import StudentsManagement from "./pages/admin/StudentsManagement";
import ParentsManagement from "./pages/admin/ParentsManagement";
import GalleryManagement from "./pages/admin/GalleryManagement";

// Teacher pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherStudents from "./pages/teacher/TeacherStudents";
import TeacherSchedule from "./pages/teacher/TeacherSchedule";

// Parent pages
import ParentDashboard from "./pages/parent/ParentDashboard";
import ParentChildren from "./pages/parent/ParentChildren";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />

            {/* Shared authenticated routes */}
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/academic-years" element={<ProtectedRoute roles={['admin']}><AcademicYearsManagement /></ProtectedRoute>} />
            <Route path="/admin/teachers" element={<ProtectedRoute roles={['admin']}><TeachersManagement /></ProtectedRoute>} />
            <Route path="/admin/classes" element={<ProtectedRoute roles={['admin']}><ClassesManagement /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute roles={['admin']}><StudentsManagement /></ProtectedRoute>} />
            <Route path="/admin/parents" element={<ProtectedRoute roles={['admin']}><ParentsManagement /></ProtectedRoute>} />
            <Route path="/admin/gallery" element={<ProtectedRoute roles={['admin']}><GalleryManagement /></ProtectedRoute>} />

            {/* Teacher routes */}
            <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/students" element={<ProtectedRoute roles={['teacher']}><TeacherStudents /></ProtectedRoute>} />
            <Route path="/teacher/schedule" element={<ProtectedRoute roles={['teacher']}><TeacherSchedule /></ProtectedRoute>} />

            {/* Parent routes */}
            <Route path="/parent" element={<ProtectedRoute roles={['parent']}><ParentDashboard /></ProtectedRoute>} />
            <Route path="/parent/children" element={<ProtectedRoute roles={['parent']}><ParentChildren /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
