(() => {
  if (typeof sb === 'undefined' || !sb.auth || !sb.functions || typeof sb.functions.invoke !== 'function') return;

  const originalInvoke = sb.functions.invoke.bind(sb.functions);

  async function getAdminAccessToken() {
    let { data: sessionData } = await sb.auth.getSession();
    let session = sessionData?.session || null;
    if (!session) throw new Error('운영자 로그인이 만료되었습니다. 로그아웃 후 다시 로그인해주세요.');

    let { data: userData, error: userError } = await sb.auth.getUser(session.access_token);

    if (userError || !userData?.user) {
      const refreshed = await sb.auth.refreshSession();
      if (refreshed.error || !refreshed.data?.session) {
        throw new Error('운영자 로그인이 만료되었습니다. 로그아웃 후 다시 로그인해주세요.');
      }

      session = refreshed.data.session;
      const verified = await sb.auth.getUser(session.access_token);
      userData = verified.data;
      userError = verified.error;
      if (userError || !userData?.user) {
        throw new Error('운영자 로그인이 만료되었습니다. 로그아웃 후 다시 로그인해주세요.');
      }
    }

    const { data: profile, error: profileError } = await sb
      .from('profiles')
      .select('role,active')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin' || !profile.active) {
      throw new Error('현재 운영자 계정으로 로그인되어 있지 않습니다. 운영자로 다시 로그인해주세요.');
    }

    return session.access_token;
  }

  sb.functions.invoke = async (functionName, options = {}) => {
    if (functionName !== 'admin-caregiver') {
      return originalInvoke(functionName, options);
    }

    try {
      const accessToken = await getAdminAccessToken();
      return originalInvoke(functionName, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${accessToken}`
        }
      });
    } catch (err) {
      return {
        data: { error: err?.message || '운영자 로그인을 다시 확인해주세요.' },
        error: null
      };
    }
  };
})();
