'use client';

import { useMemo, useState } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  ScanLine,
  Shield,
  ShieldCheck,
  Soup,
  UserCircle2,
  Users,
} from 'lucide-react';

type RoleCategory = 'ALL' | 'LEADERSHIP' | 'OPERATIONS' | 'RESIDENTS' | 'SUPPORT_STAFF';

interface RoleDefinition {
  id: string;
  name: string;
  summary: string;
  description: string;
  category: Exclude<RoleCategory, 'ALL'>;
  icon: React.ElementType;
  capabilityTags: string[];
  keyAreas: string[];
  coreFeatures: Array<{
    title: string;
    description: string;
  }>;
}

const roleCategories: Array<{ value: RoleCategory; label: string }> = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'LEADERSHIP', label: 'Leadership' },
  { value: 'OPERATIONS', label: 'Operations' },
  { value: 'RESIDENTS', label: 'Residents' },
  { value: 'SUPPORT_STAFF', label: 'Support Staff' },
];

const roleData: RoleDefinition[] = [
  {
    id: 'super-admin',
    name: 'Super Admin',
    summary: 'Owns platform governance, configuration standards, and cross-hostel visibility.',
    description:
      'The Super Admin oversees the entire platform, aligns institutional policies, and ensures every hostel operates within a unified governance framework.',
    category: 'LEADERSHIP',
    icon: Shield,
    capabilityTags: ['Governance', 'Oversight', 'Configuration', 'Reporting'],
    keyAreas: ['Platform governance', 'Institution-wide visibility', 'Policy alignment', 'Executive reporting'],
    coreFeatures: [
      {
        title: 'Manage All Hostels',
        description: 'See and guide operations across every hostel, building, and major function from one place.',
      },
      {
        title: 'Set Roles and Access',
        description: 'Control who can use the platform and what responsibilities each team can handle.',
      },
      {
        title: 'Define Policies',
        description: 'Keep hostel rules, standards, and operating practices aligned across the institution.',
      },
      {
        title: 'View Leadership Reports',
        description: 'Track occupancy, service performance, and important trends through summary dashboards.',
      },
    ],
  },
  {
    id: 'hostel-admin',
    name: 'Hostel Admin',
    summary: 'Leads day-to-day hostel administration, occupancy planning, and service coordination.',
    description:
      'The Hostel Admin manages local hostel operations, keeps accommodation resources organized, and coordinates student-facing services across the property.',
    category: 'LEADERSHIP',
    icon: Building2,
    capabilityTags: ['Administration', 'Occupancy', 'Approvals', 'Coordination'],
    keyAreas: ['Hostel operations', 'Capacity planning', 'Approvals & escalations', 'Service coordination'],
    coreFeatures: [
      {
        title: 'Manage Rooms and Beds',
        description: 'Monitor room availability, bed usage, and hostel capacity without switching between screens.',
      },
      {
        title: 'Handle Allotments',
        description: 'Assign rooms, move students when needed, and keep occupancy balanced.',
      },
      {
        title: 'Review Requests',
        description: 'Take action on leave requests, registration cases, and operational escalations.',
      },
      {
        title: 'Track Hostel Activity',
        description: 'Stay updated on resident activity, support issues, and overall hostel performance.',
      },
    ],
  },
  {
    id: 'warden',
    name: 'Warden',
    summary: 'Supervises resident welfare, discipline, attendance, and everyday hostel functioning.',
    description:
      'The Warden is the primary residential authority, focusing on student wellbeing, discipline, safety, and timely action on daily hostel matters.',
    category: 'OPERATIONS',
    icon: ShieldCheck,
    capabilityTags: ['Welfare', 'Attendance', 'Discipline', 'Approvals'],
    keyAreas: ['Resident welfare', 'Attendance control', 'Leave monitoring', 'Issue escalation'],
    coreFeatures: [
      {
        title: 'Monitor Students',
        description: 'Keep an eye on resident wellbeing, discipline, and daily hostel activity.',
      },
      {
        title: 'Take Attendance',
        description: 'Run roll call and quickly spot students who may need follow-up.',
      },
      {
        title: 'Approve Leave',
        description: 'Review student leave requests with the right context before making a decision.',
      },
      {
        title: 'Resolve Issues',
        description: 'Respond to complaints and incidents, and escalate serious matters when needed.',
      },
    ],
  },
  {
    id: 'deputy-warden',
    name: 'Deputy Warden',
    summary: 'Supports the warden with floor-level monitoring, follow-ups, and resident coordination.',
    description:
      'The Deputy Warden helps keep daily hostel processes responsive by assisting with resident tracking, communication, and operational follow-through.',
    category: 'OPERATIONS',
    icon: Users,
    capabilityTags: ['Coordination', 'Follow-up', 'Resident Support', 'Monitoring'],
    keyAreas: ['Floor-level operations', 'Resident coordination', 'Attendance follow-up', 'Support workflows'],
    coreFeatures: [
      {
        title: 'Support Daily Operations',
        description: 'Help manage day-to-day hostel follow-ups and keep pending tasks moving.',
      },
      {
        title: 'Track Student Follow-Ups',
        description: 'Watch pending student cases and make sure important actions are not missed.',
      },
      {
        title: 'Assist the Warden',
        description: 'Support supervision across floors, blocks, or assigned resident groups.',
      },
      {
        title: 'Coordinate Communication',
        description: 'Help pass updates between students, wardens, and hostel administration.',
      },
    ],
  },
  {
    id: 'student',
    name: 'Student',
    summary: 'Uses the platform for accommodation, leave, notices, complaints, and daily services.',
    description:
      'The Student experience is designed around convenience, transparency, and self-service access to residential workflows.',
    category: 'RESIDENTS',
    icon: GraduationCap,
    capabilityTags: ['Self-Service', 'Requests', 'Updates', 'Mess Access'],
    keyAreas: ['Accommodation journey', 'Leave requests', 'Resident communication', 'Daily services'],
    coreFeatures: [
      {
        title: 'Apply for Hostel',
        description: 'Submit hostel applications and track progress from request to allotment.',
      },
      {
        title: 'Request Leave',
        description: 'Send leave or outing requests and see approval status clearly.',
      },
      {
        title: 'Raise Complaints',
        description: 'Report issues and follow their progress without repeated manual follow-up.',
      },
      {
        title: 'Stay Updated',
        description: 'Check notices, mess-related updates, and other important hostel information.',
      },
    ],
  },
  {
    id: 'parent',
    name: 'Parent / Guardian',
    summary: 'Stays informed about student status, leave requests, notices, and welfare-related updates.',
    description:
      'Parents and guardians receive structured visibility into their ward hostel journey, helping them stay connected without administrative complexity.',
    category: 'RESIDENTS',
    icon: UserCircle2,
    capabilityTags: ['Visibility', 'Approvals', 'Welfare', 'Communication'],
    keyAreas: ['Ward visibility', 'Leave approvals', 'Safety awareness', 'Communication access'],
    coreFeatures: [
      {
        title: 'View Ward Updates',
        description: 'See important information related to your ward and their hostel journey.',
      },
      {
        title: 'Confirm Leave Requests',
        description: 'Review and respond to leave requests in a quick and simple way.',
      },
      {
        title: 'Receive Important Alerts',
        description: 'Stay informed about safety concerns, incidents, and discipline-related updates.',
      },
      {
        title: 'Read Notices',
        description: 'Access hostel notices and updates that matter to students and families.',
      },
    ],
  },
  {
    id: 'security',
    name: 'Security / Gate Staff',
    summary: 'Manages entry and exit verification to strengthen movement control and resident safety.',
    description:
      'Security and gate teams use the platform to validate movement efficiently while maintaining stronger safety discipline at the hostel perimeter.',
    category: 'SUPPORT_STAFF',
    icon: ScanLine,
    capabilityTags: ['Gate Control', 'Verification', 'Safety', 'Movement Logs'],
    keyAreas: ['Gate operations', 'Movement verification', 'Exception handling', 'Safety records'],
    coreFeatures: [
      {
        title: 'Check Gate Passes',
        description: 'Verify approved movement at entry and exit points with less confusion.',
      },
      {
        title: 'Record Entry and Exit',
        description: 'Maintain clear logs of student movement for safer hostel operations.',
      },
      {
        title: 'Flag Exceptions',
        description: 'Quickly escalate unusual or unapproved movement to the right authority.',
      },
      {
        title: 'Support Safety',
        description: 'Help the hostel maintain better movement visibility and stronger gate control.',
      },
    ],
  },
  {
    id: 'mess',
    name: 'Mess Management',
    summary: 'Coordinates meal services, menus, scan-based access, feedback, and service reporting.',
    description:
      'Mess teams use the platform to organize meal delivery, streamline resident access, and improve service quality through structured feedback and reporting.',
    category: 'SUPPORT_STAFF',
    icon: Soup,
    capabilityTags: ['Meal Service', 'Menus', 'Access', 'Feedback'],
    keyAreas: ['Meal operations', 'Menu planning', 'Resident access', 'Service reporting'],
    coreFeatures: [
      {
        title: 'Publish Menus',
        description: 'Share meal schedules clearly so residents know what is being served.',
      },
      {
        title: 'Manage Meal Access',
        description: 'Use scans or validation checks to keep meal service smooth and organized.',
      },
      {
        title: 'Handle Rebates',
        description: 'Track meal-related exceptions and keep service records easier to manage.',
      },
      {
        title: 'Review Feedback',
        description: 'Use resident feedback to improve dining quality and service planning.',
      },
    ],
  },
];

const overviewStats = [
  { label: 'No. of Roles', value: '8' },
  { label: 'Functional Areas', value: '12+' },
  { label: 'Key Operational Workflows', value: '25+' },
];

const platformAreas = [
  {
    title: 'Administration & Governance',
    description: 'Configuration, policy control, user oversight, and institution-level reporting.',
  },
  {
    title: 'Resident Lifecycle',
    description: 'Registration, accommodation, leave management, and day-to-day student services.',
  },
  {
    title: 'Operations & Safety',
    description: 'Attendance, gate monitoring, movement validation, issue handling, and welfare support.',
  },
  {
    title: 'Service Delivery',
    description: 'Mess operations, resident communication, feedback channels, and support coordination.',
  },
];

export default function RolesResponsibilitiesPage() {
  const [activeCategory, setActiveCategory] = useState<RoleCategory>('ALL');
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const filteredRoles = useMemo(() => {
    if (activeCategory === 'ALL') return roleData;
    return roleData.filter((role) => role.category === activeCategory);
  }, [activeCategory]);

  const toggleRole = (roleId: string) => {
    setExpandedRole((current) => (current === roleId ? null : roleId));
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <Topbar
        title="Roles & Features"
        subtitle="A product overview of who uses the platform and what each role enables."
      />

      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.08),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(30,64,175,0.08),_transparent_34%)]" />

        <div className="relative p-6 md:p-8 xl:p-10">
          <section className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(247,250,252,0.98))] p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] md:p-8">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_360px]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-teal-600" />
                  Demo Overview
                </div>

                <div className="max-w-4xl space-y-4">
                  <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                    Roles & Features
                  </h1>
                  <p className="max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
                    A role-based hostel management platform designed to streamline administration,
                    student services, accommodation, operations, and resident welfare.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {overviewStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)]"
                    >
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                        {stat.label}
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-slate-900">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200/80 bg-slate-950 p-6 text-slate-50 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.8)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  What The Platform Does
                </p>
                <div className="mt-5 space-y-4">
                  {platformAreas.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-teal-500/20 p-1.5 text-teal-300">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                          <h2 className="text-sm font-semibold text-white">{item.title}</h2>
                          <p className="mt-1 text-sm leading-6 text-slate-300">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Role-first overview</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Explore each role to understand who uses the platform and what they can do.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {roleCategories.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => setActiveCategory(category.value)}
                      className={cn(
                        'rounded-full border px-3 py-2 text-sm font-medium transition',
                        activeCategory === category.value
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                      )}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredRoles.map((role) => {
                const Icon = role.icon;
                const isExpanded = expandedRole === role.id;

                return (
                  <article
                    key={role.id}
                    className={cn(
                      'rounded-2xl border bg-white p-5 shadow-sm transition',
                      isExpanded ? 'border-indigo-200' : 'border-gray-200 hover:border-gray-300',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      className="w-full text-left"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                            <p className="mt-2 text-sm leading-6 text-gray-500">{role.summary}</p>
                          </div>
                        </div>

                        <ChevronDown
                          className={cn(
                            'mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform duration-300',
                            isExpanded && 'rotate-180 text-indigo-600',
                          )}
                        />
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {role.capabilityTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                        <span className="text-sm font-medium text-gray-700">View Features</span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </button>

                    <div
                      className={cn(
                        'grid transition-all duration-300 ease-out',
                        isExpanded ? 'grid-rows-[1fr] pt-5' : 'grid-rows-[0fr]',
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="border-t border-gray-100 pt-5">
                          <p className="text-sm leading-6 text-gray-600">{role.description}</p>

                          <div className="mt-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                              Key Areas
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {role.keyAreas.map((area) => (
                                <Badge key={area} className="bg-indigo-50 text-indigo-700">
                                  {area}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="mt-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                              Features
                            </p>
                            <div className="mt-3 space-y-3">
                              {role.coreFeatures.map((feature) => (
                                <div
                                  key={feature.title}
                                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                                >
                                  <p className="text-sm font-semibold text-gray-900">{feature.title}</p>
                                  <p className="mt-1 text-sm leading-6 text-gray-600">
                                    {feature.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
