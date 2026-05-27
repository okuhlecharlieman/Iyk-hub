import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { AuthMiddleware } from '../../../../lib/api/auth-middleware';

export async function GET(request) {
  const auth = await AuthMiddleware.requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await initializeFirebaseAdmin();
    const db = admin.firestore();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const prevStartDate = new Date();
    prevStartDate.setDate(prevStartDate.getDate() - days * 2);
    const prevStartDateStr = prevStartDate.toISOString().split('T')[0];

    const engagementSnap = await db
      .collection('engagement')
      .where('date', '>=', prevStartDateStr)
      .get();

    let totalPageViews = 0;
    let prevPageViews = 0;
    let totalSessionSeconds = 0;
    let sessionEntries = 0;
    let prevSessionSeconds = 0;
    let prevSessionEntries = 0;
    const uniqueUserIds = new Set();
    const prevUniqueUserIds = new Set();
    const pageViewCounts = {};
    const eventCounts = {};
    const dailyMap = {};
    const userPageMap = {};

    engagementSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const isCurrent = data.date >= startDateStr;

      if (isCurrent) {
        uniqueUserIds.add(data.userId);
        totalPageViews += data.totalPageViews || 0;

        if (data.totalSessionSeconds) {
          totalSessionSeconds += data.totalSessionSeconds;
          sessionEntries++;
        }

        if (data.pages) {
          Object.entries(data.pages).forEach(([page, count]) => {
            const pageName = page.replace(/_/g, '/');
            pageViewCounts[pageName] = (pageViewCounts[pageName] || 0) + count;
          });
        }

        if (data.events) {
          Object.entries(data.events).forEach(([event, count]) => {
            eventCounts[event] = (eventCounts[event] || 0) + count;
          });
        }

        const date = data.date;
        if (date) {
          if (!dailyMap[date]) {
            dailyMap[date] = { date, views: 0, users: new Set() };
          }
          dailyMap[date].views += data.totalPageViews || 0;
          dailyMap[date].users.add(data.userId);
        }

        if (data.userId && data.pages) {
          if (!userPageMap[data.userId]) userPageMap[data.userId] = {};
          Object.entries(data.pages).forEach(([page, count]) => {
            const pageName = page.replace(/_/g, '/');
            userPageMap[data.userId][pageName] = (userPageMap[data.userId][pageName] || 0) + count;
          });
        }
      } else {
        prevUniqueUserIds.add(data.userId);
        prevPageViews += data.totalPageViews || 0;
        if (data.totalSessionSeconds) {
          prevSessionSeconds += data.totalSessionSeconds;
          prevSessionEntries++;
        }
      }
    });

    const topPages = Object.entries(pageViewCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, views]) => ({ page, views }));

    const topEvents = Object.entries(eventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([event, count]) => ({ event, count }));

    const dailyActivity = Object.values(dailyMap)
      .map((d) => ({ date: d.date, views: d.views, users: d.users.size }))
      .sort((a, b) => a.date.localeCompare(b.date));

    let recentEvents = [];
    try {
      const eventsSnap = await db
        .collection('engagementEvents')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      recentEvents = eventsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() || null,
      }));
    } catch {
      // engagementEvents may not exist yet
    }

    // Compute period-over-period changes
    const prevAvgSession = prevSessionEntries > 0 ? Math.round(prevSessionSeconds / prevSessionEntries) : 0;
    const avgSession = sessionEntries > 0 ? Math.round(totalSessionSeconds / sessionEntries) : 0;

    const trends = {
      pageViewsChange: prevPageViews > 0 ? Math.round(((totalPageViews - prevPageViews) / prevPageViews) * 100) : null,
      usersChange: prevUniqueUserIds.size > 0 ? Math.round(((uniqueUserIds.size - prevUniqueUserIds.size) / prevUniqueUserIds.size) * 100) : null,
      sessionChange: prevAvgSession > 0 ? Math.round(((avgSession - prevAvgSession) / prevAvgSession) * 100) : null,
    };

    // User journey analysis
    const featureAdoption = {};
    const featurePages = {
      'Games': ['/games', '/games/spin-wheel'],
      'Showcase': ['/showcase'],
      'Leaderboard': ['/leaderboard'],
      'Random Chat': ['/random-chat'],
      'Opportunities': ['/opportunities'],
      'Challenges': ['/challenges'],
      'Boosts': ['/boosts'],
      'Profile': ['/profile'],
      'Donate': ['/donate'],
    };
    const totalUsers = uniqueUserIds.size || 1;
    for (const [feature, pages] of Object.entries(featurePages)) {
      let usersUsingFeature = 0;
      for (const uid of uniqueUserIds) {
        const userPages = userPageMap[uid] || {};
        if (pages.some((p) => Object.keys(userPages).some((up) => up.startsWith(p)))) {
          usersUsingFeature++;
        }
      }
      featureAdoption[feature] = {
        users: usersUsingFeature,
        percentage: Math.round((usersUsingFeature / totalUsers) * 100),
      };
    }

    // Drop-off analysis
    const dropOff = [];
    const sortedPages = Object.entries(pageViewCounts).sort((a, b) => b[1] - a[1]);
    if (sortedPages.length >= 2) {
      const maxViews = sortedPages[0][1];
      for (const [page, views] of sortedPages.slice(0, 8)) {
        dropOff.push({
          page,
          views,
          retentionPct: Math.round((views / maxViews) * 100),
        });
      }
    }

    // Generate actionable insights
    const insights = [];

    // Low engagement pages
    const lowEngagementFeatures = Object.entries(featureAdoption)
      .filter(([, data]) => data.percentage < 15 && data.percentage > 0)
      .map(([name]) => name);
    if (lowEngagementFeatures.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Low Feature Adoption',
        description: `${lowEngagementFeatures.join(', ')} ${lowEngagementFeatures.length === 1 ? 'has' : 'have'} less than 15% adoption. Consider adding onboarding prompts, in-app tutorials, or featuring ${lowEngagementFeatures.length === 1 ? 'it' : 'them'} on the dashboard.`,
        priority: 'high',
      });
    }

    // Unused features
    const unusedFeatures = Object.entries(featureAdoption)
      .filter(([, data]) => data.users === 0)
      .map(([name]) => name);
    if (unusedFeatures.length > 0) {
      insights.push({
        type: 'critical',
        title: 'Unused Features',
        description: `${unusedFeatures.join(', ')} ${unusedFeatures.length === 1 ? 'has' : 'have'} zero users in this period. Evaluate whether to improve discoverability, redesign, or retire ${unusedFeatures.length === 1 ? 'this feature' : 'these features'}.`,
        priority: 'high',
      });
    }

    // Session duration insights
    if (avgSession > 0 && avgSession < 60) {
      insights.push({
        type: 'warning',
        title: 'Very Short Sessions',
        description: `Average session is ${avgSession}s — users leave quickly. Focus on improving the first-load experience: faster load times, a clear value proposition above the fold, and immediate interactive content.`,
        priority: 'high',
      });
    } else if (avgSession > 300) {
      insights.push({
        type: 'success',
        title: 'Strong Session Duration',
        description: `Average session is ${Math.round(avgSession / 60)}+ minutes — users are highly engaged. Consider adding more content or social features to deepen engagement further.`,
        priority: 'low',
      });
    }

    // Growth trends
    if (trends.usersChange !== null && trends.usersChange < -20) {
      insights.push({
        type: 'critical',
        title: 'User Drop-Off',
        description: `Active users dropped ${Math.abs(trends.usersChange)}% vs previous period. Investigate what changed: broken features, missing content, or seasonal patterns. Consider a re-engagement campaign or push notifications.`,
        priority: 'high',
      });
    } else if (trends.usersChange !== null && trends.usersChange > 20) {
      insights.push({
        type: 'success',
        title: 'User Growth',
        description: `Active users grew ${trends.usersChange}% vs previous period. Great momentum — double down on what's working and ensure the infrastructure can handle growth.`,
        priority: 'low',
      });
    }

    // Top feature recommendation
    const topFeature = Object.entries(featureAdoption)
      .filter(([, data]) => data.percentage > 0)
      .sort((a, b) => b[1].percentage - a[1].percentage)[0];
    if (topFeature && topFeature[1].percentage > 50) {
      insights.push({
        type: 'info',
        title: `"${topFeature[0]}" Is Your Star Feature`,
        description: `${topFeature[1].percentage}% of users visit ${topFeature[0]}. Invest in making it even better — add features, improve UX, and use it as an anchor to cross-promote less-used sections.`,
        priority: 'medium',
      });
    }

    // Game engagement
    if (eventCounts['spin_wheel'] || eventCounts['buy_spin']) {
      const spins = (eventCounts['spin_wheel'] || 0);
      const buys = (eventCounts['buy_spin'] || 0);
      if (buys > 0) {
        insights.push({
          type: 'info',
          title: 'Spin Wheel Monetization',
          description: `${spins} spins with ${buys} purchased (${Math.round((buys / (spins || 1)) * 100)}% conversion). ${buys > spins * 0.3 ? 'High buy rate — consider adding more purchasable rewards.' : 'Low buy rate — consider reducing spin cost or adding better prizes.'}`,
          priority: 'medium',
        });
      }
    }

    // No data insight
    if (totalPageViews === 0 && uniqueUserIds.size === 0) {
      insights.push({
        type: 'info',
        title: 'No Data Yet',
        description: 'Engagement tracking is active but no data has been collected yet. Make sure the Firestore rules are deployed and users are visiting the app.',
        priority: 'low',
      });
    }

    return NextResponse.json({
      totalPageViews,
      uniqueUsers: uniqueUserIds.size,
      avgSessionSeconds: avgSession,
      trends,
      topPages,
      topEvents,
      dailyActivity,
      recentEvents,
      featureAdoption,
      dropOff,
      insights,
    });
  } catch (err) {
    console.error('Engagement API error:', err);
    return NextResponse.json({ error: 'Failed to fetch engagement data' }, { status: 500 });
  }
}
