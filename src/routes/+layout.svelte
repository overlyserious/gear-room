<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';

  let { children } = $props();

  const navLinks = [
    { href: '/checkout', label: 'Checkout' },
    { href: '/return', label: 'Return' },
    { href: '/inventory', label: 'Inventory' },
    { href: '/dashboard', label: 'Dashboard' }
  ];

  const currentPath = $derived($page.url.pathname);
</script>

<div class="min-h-screen bg-gray-50">
  <nav class="bg-white border-b border-gray-200">
    <div class="max-w-5xl mx-auto px-6 flex items-center justify-between h-14">
      <a href="/" class="text-lg font-bold text-gray-900 hover:text-gray-700">Gear Room</a>
      <div class="flex items-center gap-1">
        {#each navLinks as link}
          <a
            href={link.href}
            class="px-3 py-2 text-sm rounded-md transition-colors
              {currentPath.startsWith(link.href)
                ? 'text-gray-900 bg-gray-100 font-medium'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}"
          >
            {link.label}
          </a>
        {/each}
      </div>
    </div>
  </nav>

  {@render children()}
</div>
