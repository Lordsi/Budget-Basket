function formatPrice(amount) {
  return 'MWK ' + Number(amount).toLocaleString('en-MW');
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + 'm ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  return days + 'd ago';
}

function formatPriceUpdated(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  var seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 3600) return 'Verified \u2713';
  if (seconds < 86400) return 'Updated ' + Math.floor(seconds / 3600) + 'h ago';
  return 'Last checked ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getInitials(name) {
  return (name || '')
    .split(' ')
    .map(function(n) { return n[0]; })
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
