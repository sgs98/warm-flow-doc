# 团队


<table class="wf-team">
    <thead>
        <tr style="text-align: left;">
            <th>avatar</th>
            <th>name</th>
            <th>email</th>
            <th>role</th>
            <th>contributions</th>
        </tr>
    </thead>
    <tbody>
        <tr v-for="(item, index) in authorsList" :key="index">
            <td><img :src="avatarOf(item)" width="30px"></td>
            <td>
                <a v-if="item.html_url" :href="item.html_url" target="_blank">{{ displayName(item) }}</a>
                <span v-else>{{ displayName(item) }}</span>
            </td>
            <td><a v-if="item.email" :href="'mailto:' + item.email">{{ item.email }}</a></td>
            <td>{{ item.role }}</td>
            <td>{{ item.contributions }}</td>
        </tr>
    </tbody>
</table>

<script>
import { ref, onMounted } from 'vue';
 
export default {
  setup() {
    const authorsList = ref([]);
 
    // 头像映射：Gitee 的 contributors 接口不返回头像，且返回的 name 可能是昵称，
    // 需要在工作流引擎仓库有提交记录的成员，在此手动配置 Gitee 头像地址
    const AVATARS = {
      'gssong': 'https://foruda.gitee.com/avatar/1686117388709737644/5363069_sgs98_1686117388.png',
    };

    const avatarOf = (item) => item.avatar_url || AVATARS[item.name] || '/logo.png';

    // 展示名覆盖：Gitee 统计出的贡献者名与本人惯用名不一致时，在此做映射
    const DISPLAY_NAMES = {
      'gssong': 'may',
    };

    const displayName = (item) => DISPLAY_NAMES[item.name] || item.name || item.login;

    // 核心成员角色，与工作流引擎 pom.xml 的 developers 保持一致
    const MEMBERS = {
      'warm': { role: 'Author' },
      'xiarigang': { role: 'PMC' },
      'vanlin': { role: 'PMC' },
      'liangli': { role: 'PMC' },
      'Zhen': { role: 'PMC' },
    };

    // 兜底数据：Gitee 接口未认证请求按 IP 限速（超限返回 403），
    // 拉取失败时用这份快照，避免页面空白
    const FALLBACK = [
      { name: 'gssong', email: '1742057357@qq.com', contributions: 21 },
      { name: '疯狂的狮子Li', email: '15040126243@163.com', contributions: 16 },
      { name: 'AprilWind', email: '2100166581@qq.com', contributions: 9 },
    ];

    const buildList = (contributors) => contributors.map(author => ({
      ...author,
      role: (MEMBERS[author.name] || {}).role || 'Committer',
    }));

    const fetchData = async () => {
      try {
        const response = await fetch('https://gitee.com/api/v5/repos/sgs98/warm-flow/contributors?type=authors');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        authorsList.value = buildList(await response.json());
      } catch (error) {
        console.error('Error fetching contributors, fallback to snapshot:', error);
        authorsList.value = buildList(FALLBACK);
      }
    };
 
    onMounted(fetchData);
 
    return {
      authorsList,
      displayName,
      avatarOf,
    };
  },
};
</script>

<style>
.header {
  margin: calc(2rem - 0.165em) 0em 1rem;
}
.user-list-item {
  display: inline-flex;
  align-items: center;
  margin: 15px 0;
  padding: 14px 0 14px 10px;
  width: 178px;
  .avatar {
    height: 50px;
    margin-right: 10px;
    border-radius: 50%;
  }
  .content {
    line-height: 22px;
    .username,
    .sub-info {
      display: block;
      color: #40485b;
      font-size: 14px;
      font-weight: 400;
    }
    .username {
      font-weight: 600;
      font-size: 16px;
    }
  }
}
</style>

