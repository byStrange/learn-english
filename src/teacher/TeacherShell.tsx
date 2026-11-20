// Scaffolded from the Curialy UI template "shell-side-nav" (v0.7.16, MIT): replace its content, keep its layout and spacing.
// Copyright (c) Meta Platforms, Inc. and affiliates.

import {Outlet, useLocation} from 'react-router';
import {AppShell} from '@curialy/ui/AppShell';
import {Divider} from '@curialy/ui/Divider';
import {Icon} from '@curialy/ui/Icon';
import {NavIcon} from '@curialy/ui/NavIcon';
import {SideNav, SideNavHeading, SideNavItem, SideNavSection} from '@curialy/ui/SideNav';
import {
  AcademicCapIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  MapIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import {allLearners} from '../content/index';
import {logout} from '../state/auth';

/**
 * The teacher panel frame: AppShell with a SideNav (desktop first; on a
 * narrow window AppShell turns the nav into its mobile menu).
 */
export default function TeacherShell() {
  const {pathname} = useLocation();
  const at = (path: string) => pathname === path || pathname === `${path}/`;
  return (
    <AppShell
      contentPadding={0}
      sideNav={
        <SideNav
          collapsible
          header={<SideNavHeading heading="Teacher panel" icon={<NavIcon icon={<Icon icon={AcademicCapIcon} size="sm" />} />} headingHref="/teacher" />}
          footer={
            <SideNavSection title="Learner app" isHeaderHidden>
              <SideNavItem label="Open learner app" icon={ArrowTopRightOnSquareIcon} href="/" />
              <SideNavItem label="Log out" icon={ArrowRightStartOnRectangleIcon} onClick={() => void logout('teacher')} />
            </SideNavSection>
          }>
          <SideNavSection title="Menu" isHeaderHidden>
            <SideNavItem label="Overview" icon={ChartBarIcon} href="/teacher" isSelected={at('/teacher')} />
            <SideNavItem label="Learners" icon={UserGroupIcon} collapsible={{defaultIsCollapsed: false}}>
              {allLearners().map(({learner, track}) => (
                <SideNavItem
                  key={learner.id}
                  label={`${learner.name} · ${track.shortName}`}
                  icon={UserIcon}
                  href={`/teacher/learner/${learner.id}`}
                  isSelected={at(`/teacher/learner/${learner.id}`)}
                />
              ))}
            </SideNavItem>
          </SideNavSection>
          <Divider />
          <SideNavSection title="Plan" isHeaderHidden>
            <SideNavItem label="Roadmap" icon={MapIcon} href="/teacher/roadmap" isSelected={at('/teacher/roadmap')} />
            <SideNavItem label="Lesson plans" icon={ClipboardDocumentListIcon} href="/teacher/plans" isSelected={at('/teacher/plans')} />
            <SideNavItem label="Resources" icon={BookOpenIcon} href="/teacher/resources" isSelected={at('/teacher/resources')} />
          </SideNavSection>
        </SideNav>
      }>
      <Outlet />
    </AppShell>
  );
}
