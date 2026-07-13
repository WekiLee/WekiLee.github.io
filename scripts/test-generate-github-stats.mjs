import assert from 'node:assert/strict';
import { renderLanguagesSvg, renderStatsSvg, validateSvg } from './generate-github-stats.mjs';

const user = {
    login: 'Weki<&Lee',
    public_repos: 12,
    followers: 34,
    following: 5
};
const repositories = [
    { fork: false, stargazers_count: 9 },
    { fork: false, stargazers_count: 4 },
    { fork: true, stargazers_count: 99 }
];
const languages = [
    ['JavaScript', 75],
    ['C++', 25]
];

for (const theme of ['light', 'dark']) {
    const statsSvg = renderStatsSvg(user, repositories, theme);
    const languagesSvg = renderLanguagesSvg(languages, theme);

    validateSvg(statsSvg, `github-stats-${theme}.svg`);
    validateSvg(languagesSvg, `top-langs-${theme}.svg`);
    assert.match(statsSvg, /Weki&lt;&amp;Lee/);
    assert.match(statsSvg, />13</);
    assert.match(languagesSvg, />75%</);
}

assert.throws(function() {
    validateSvg('DEPLOYMENT_PAUSED', 'invalid.svg');
}, /不是有效的 SVG 文本/);
assert.throws(function() {
    renderStatsSvg(user, repositories, 'invalid');
}, /未知主题/);

console.log('GitHub 统计图生成器测试通过。');
