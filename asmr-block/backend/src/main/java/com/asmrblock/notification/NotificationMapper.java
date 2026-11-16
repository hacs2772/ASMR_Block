package com.asmrblock.notification;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface NotificationMapper {

    void insert(Notification notification);

    /** 안 읽은 같은 담김 소식이 있으면 사람 수만 늘림 → 바뀐 줄 수 */
    int bumpUnread(@Param("userId") Long userId, @Param("type") NotificationType type,
                   @Param("blockId") Long blockId, @Param("playlistId") Long playlistId,
                   @Param("actorNickname") String actorNickname, @Param("title") String title);

    List<Notification> findByUser(@Param("userId") Long userId, @Param("offset") int offset, @Param("limit") int limit);

    long countByUser(Long userId);

    long countUnread(Long userId);

    int markRead(@Param("userId") Long userId, @Param("ids") List<Long> ids);

    int deleteOlderThanDays(int days);

    /** 알림 설정 [review, collect] (없는 사람이면 null) */
    NotifySettings findSettings(Long userId);

    void updateSettings(@Param("userId") Long userId, @Param("review") boolean review, @Param("collect") boolean collect);
}
