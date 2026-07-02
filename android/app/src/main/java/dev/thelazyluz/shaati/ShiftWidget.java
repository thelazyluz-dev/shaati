package dev.thelazyluz.shaati;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

/**
 * Home-screen widget with quick clock-in / clock-out buttons.
 * Each button deep-links into the TWA at ?action=clockin / ?action=clockout,
 * which the web app handles on load (same flow as the app-icon shortcuts).
 */
public class ShiftWidget extends AppWidgetProvider {

    private static final String BASE_URL = "https://thelazyluz-dev.github.io/shaati/index.html";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_shift);
            views.setOnClickPendingIntent(R.id.btn_in, actionIntent(context, "clockin", 1));
            views.setOnClickPendingIntent(R.id.btn_out, actionIntent(context, "clockout", 2));
            views.setOnClickPendingIntent(R.id.header, openAppIntent(context));
            manager.updateAppWidget(id, views);
        }
    }

    private PendingIntent openAppIntent(Context context) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(BASE_URL));
        intent.setPackage(context.getPackageName());
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(
                context, 3, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent actionIntent(Context context, String action, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(BASE_URL + "?action=" + action));
        intent.setPackage(context.getPackageName());
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(
                context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
