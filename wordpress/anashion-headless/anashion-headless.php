<?php
/**
 * Plugin Name: Anashion Headless
 * Description: Connects WordPress + WooCommerce to the Anashion Next.js storefront: editable homepage content, a REST endpoint for it, bag-to-checkout hand-off, and instant site refresh when products or content change.
 * Version: 0.2.0
 * Requires at least: 6.4
 * Requires PHP: 8.0
 * Requires Plugins: woocommerce
 * Text Domain: anashion-headless
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const ANASHION_OPTION = 'anashion_headless';

/*
 * Empty fields are fine: the storefront falls back to its built-in default
 * text (frontend/src/lib/mock.ts), so the client only fills what they want to change.
 */

/** Homepage sections whose heading copy is editable. key => admin label. */
function anashion_sections(): array {
	return array(
		'occasions'  => 'Occasions (arches)',
		'tryLook'    => 'Try the Look',
		'fabrics'    => 'Pick a Fabric (3D cards)',
		'rail'       => 'The Rail',
		'devotion'   => 'Devotion strip',
		'drape'      => 'Feel the Drape',
		'collection' => 'Bridal Collection',
		'motion'     => 'Brides in Motion (reels)',
		'weave'      => 'Three Threads (weave)',
	);
}

/**
 * All editable fields: key => [label, type, section-id].
 * Types: text, textarea, url, image, lines, number, password.
 */
function anashion_fields(): array {
	$f = array(
		'hero_eyebrow'          => array( 'Small heading', 'text', 'hero' ),
		'hero_title'            => array( 'Title', 'text', 'hero' ),
		'hero_title_accent'     => array( 'Title accent (italic)', 'text', 'hero' ),
		'hero_subtitle'         => array( 'Subtitle', 'textarea', 'hero' ),
		'hero_cta_label'        => array( 'Main button label', 'text', 'hero' ),
		'hero_cta_href'         => array( 'Main button link', 'text', 'hero' ),
		'hero_secondary_label'  => array( 'Second button label', 'text', 'hero' ),
		'hero_secondary_href'   => array( 'Second button link', 'text', 'hero' ),
		'hero_image'            => array( 'Fallback image (shown if 3D is unavailable)', 'image', 'hero' ),
		'hero_video'            => array( 'Walk-through video URL (MP4, optional; replaces the 3D hallway, scrubbed by scroll)', 'url', 'hero' ),
		'heritage_eyebrow'      => array( 'Small heading', 'text', 'heritage' ),
		'heritage_title'        => array( 'Title', 'text', 'heritage' ),
		'heritage_body'         => array( 'Text', 'textarea', 'heritage' ),
		'heritage_image'        => array( 'Image', 'image', 'heritage' ),
		'marquee'               => array( 'Ribbon words (one per line)', 'lines', 'strips' ),
		'ticker'                => array( 'Bottom ticker (one per line: Label | text)', 'lines', 'strips' ),
		'weave_discount'        => array( 'Three Threads bundle discount (%)', 'number', 'strips' ),
	);
	foreach ( anashion_sections() as $key => $label ) {
		$f[ "s_{$key}_eyebrow" ]  = array( 'Small heading', 'text', "s_{$key}" );
		$f[ "s_{$key}_title" ]    = array( 'Title', 'text', "s_{$key}" );
		$f[ "s_{$key}_accent" ]   = array( 'Title accent (pink italic)', 'text', "s_{$key}" );
		$f[ "s_{$key}_subtitle" ] = array( 'Subtitle', 'textarea', "s_{$key}" );
	}
	$f['footer_title']      = array( 'Headline', 'text', 'footer' );
	$f['footer_accent']     = array( 'Headline accent', 'text', 'footer' );
	$f['footer_note']       = array( 'Visit note', 'textarea', 'footer' );
	$f['frontend_url']      = array( 'Storefront URL (e.g. https://anashion.com)', 'url', 'connection' );
	$f['revalidate_secret'] = array( 'Revalidate secret (same as REVALIDATE_SECRET in the storefront)', 'password', 'connection' );
	return $f;
}

function anashion_get( string $key ): string {
	$opts = get_option( ANASHION_OPTION, array() );
	return is_array( $opts ) ? (string) ( $opts[ $key ] ?? '' ) : '';
}

/* -------------------------------------------------------------------------
 * Admin: Settings → Anashion Headless
 * ---------------------------------------------------------------------- */
add_action(
	'admin_menu',
	function () {
		$hook = add_options_page( 'Anashion Headless', 'Anashion Headless', 'manage_options', 'anashion-headless', 'anashion_render_settings' );
		add_action( "admin_print_scripts-{$hook}", 'wp_enqueue_media' );
	}
);

add_action(
	'admin_init',
	function () {
		register_setting(
			'anashion_headless',
			ANASHION_OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => 'anashion_sanitize',
				'default'           => array(),
			)
		);
		$sections = array(
			'hero'     => 'Hero (first screen)',
			'heritage' => 'Heritage panel',
			'strips'   => 'Ribbon, ticker & bundle',
		);
		foreach ( anashion_sections() as $key => $label ) {
			$sections[ "s_{$key}" ] = "Section: {$label}";
		}
		$sections['footer']     = 'Footer';
		$sections['connection'] = 'Storefront connection';
		foreach ( $sections as $id => $title ) {
			add_settings_section( $id, $title, '__return_false', 'anashion-headless' );
		}

		foreach ( anashion_fields() as $key => [ $label, $type, $section ] ) {
			add_settings_field(
				$key,
				esc_html( $label ),
				function () use ( $key, $type ) {
					$name  = ANASHION_OPTION . '[' . $key . ']';
					$value = anashion_get( $key );
					switch ( $type ) {
						case 'textarea':
						case 'lines':
							printf( '<textarea class="large-text" rows="%d" name="%s">%s</textarea>', 'lines' === $type ? 6 : 3, esc_attr( $name ), esc_textarea( $value ) );
							break;
						case 'image':
							printf(
								'<input class="regular-text anashion-image" type="url" name="%1$s" value="%2$s" /> <button type="button" class="button anashion-pick">Choose image</button>',
								esc_attr( $name ),
								esc_attr( $value )
							);
							break;
						default:
							printf( '<input class="regular-text" type="%s" name="%s" value="%s" autocomplete="off" />', esc_attr( $type ), esc_attr( $name ), esc_attr( $value ) );
					}
				},
				'anashion-headless',
				$section
			);
		}
	}
);

function anashion_sanitize( $input ): array {
	$input = is_array( $input ) ? $input : array();
	$out   = array();
	foreach ( anashion_fields() as $key => [ , $type ] ) {
		$val = isset( $input[ $key ] ) ? wp_unslash( $input[ $key ] ) : '';
		if ( 'password' === $type && '' === $val ) {
			$val = anashion_get( $key ); // keep the existing secret when left blank
		}
		$out[ $key ] = match ( $type ) {
			'textarea', 'lines' => sanitize_textarea_field( $val ),
			'url', 'image'      => esc_url_raw( untrailingslashit( $val ) ),
			'number'            => '' === $val ? '' : (string) max( 0, min( 90, absint( $val ) ) ),
			default             => sanitize_text_field( $val ),
		};
	}
	return $out;
}

function anashion_render_settings(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	echo '<div class="wrap"><h1>Anashion Headless</h1>';
	echo '<p><strong>Leave any field empty to keep the website\'s default text.</strong></p>';
	echo '<p>Products, prices, stock, sizes and photos: <strong>Products</strong>. Which products appear in each homepage section: product categories <code>try-the-look</code>, <code>pick-a-fabric</code>, <code>devotion-edit</code>, <code>feel-the-drape</code>, <code>bridal-collection</code>, <code>in-motion</code>, <code>weave</code>. Occasions: child categories of <code>occasions</code> (name, description, image). Garment filters: child categories of <code>garments</code>. Menu: <strong>Appearance → Menus</strong> ("Storefront main menu").</p>';
	echo '<form method="post" action="options.php">';
	settings_fields( 'anashion_headless' );
	do_settings_sections( 'anashion-headless' );
	submit_button();
	echo '</form></div>';
	?>
	<script>
	document.addEventListener('click', function (e) {
		if (!e.target.classList.contains('anashion-pick')) return;
		var input = e.target.previousElementSibling;
		var frame = wp.media({ title: 'Choose image', multiple: false, library: { type: 'image' } });
		frame.on('select', function () { input.value = frame.state().get('selection').first().toJSON().url; });
		frame.open();
	});
	</script>
	<?php
}

/* -------------------------------------------------------------------------
 * Navigation menu location (Appearance → Menus)
 * ---------------------------------------------------------------------- */
add_action(
	'after_setup_theme',
	function () {
		register_nav_menus( array( 'anashion_primary' => 'Storefront main menu' ) );
	}
);

/* -------------------------------------------------------------------------
 * REST: GET /wp-json/anashion/v1/home  (public, read-only)
 * Shape matches HomeContent in frontend/src/lib/types.ts. Empty = default.
 * ---------------------------------------------------------------------- */
add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'anashion/v1',
			'/home',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'callback'            => 'anashion_rest_home',
			)
		);
	}
);

function anashion_lines( string $key ): array {
	return array_values( array_filter( array_map( 'trim', explode( "\n", anashion_get( $key ) ) ) ) );
}

function anashion_rest_home(): WP_REST_Response {
	$g = 'anashion_get';

	$nav       = array();
	$locations = get_nav_menu_locations();
	if ( ! empty( $locations['anashion_primary'] ) ) {
		foreach ( wp_get_nav_menu_items( $locations['anashion_primary'] ) ?: array() as $item ) {
			if ( 0 === (int) $item->menu_item_parent ) {
				$nav[] = array( 'label' => wp_strip_all_tags( $item->title ), 'href' => esc_url_raw( $item->url ) );
			}
		}
	}

	$ticker = array();
	foreach ( anashion_lines( 'ticker' ) as $line ) {
		$parts    = array_map( 'trim', explode( '|', $line, 2 ) );
		$ticker[] = array( 'label' => $parts[0], 'text' => $parts[1] ?? '' );
	}

	$sections = array();
	foreach ( array_keys( anashion_sections() ) as $key ) {
		$sections[ $key ] = array(
			'eyebrow'  => $g( "s_{$key}_eyebrow" ),
			'title'    => $g( "s_{$key}_title" ),
			'accent'   => $g( "s_{$key}_accent" ),
			'subtitle' => $g( "s_{$key}_subtitle" ),
		);
	}

	return new WP_REST_Response(
		array(
			'nav'      => $nav,
			'hero'     => array(
				'eyebrow'        => $g( 'hero_eyebrow' ),
				'title'          => $g( 'hero_title' ),
				'titleAccent'    => $g( 'hero_title_accent' ),
				'subtitle'       => $g( 'hero_subtitle' ),
				'ctaLabel'       => $g( 'hero_cta_label' ),
				'ctaHref'        => $g( 'hero_cta_href' ),
				'secondaryLabel' => $g( 'hero_secondary_label' ),
				'secondaryHref'  => $g( 'hero_secondary_href' ),
				'image'          => $g( 'hero_image' ),
				'video'          => $g( 'hero_video' ),
			),
			'heritage' => array(
				'eyebrow' => $g( 'heritage_eyebrow' ),
				'title'   => $g( 'heritage_title' ),
				'body'    => $g( 'heritage_body' ),
				'image'   => $g( 'heritage_image' ),
			),
			'marquee'  => anashion_lines( 'marquee' ),
			'ticker'   => $ticker,
			'sections' => $sections,
			'footer'   => array(
				'title'  => $g( 'footer_title' ),
				'accent' => $g( 'footer_accent' ),
				'note'   => $g( 'footer_note' ),
			),
			'weave'    => array(
				'discountPercent' => '' === $g( 'weave_discount' ) ? null : (int) $g( 'weave_discount' ),
			),
		)
	);
}

/* -------------------------------------------------------------------------
 * Bag → WooCommerce checkout hand-off.
 * The storefront links to  /?anashion_cart=ID:QTY[:SIZE],ID:QTY[:SIZE]
 * We rebuild the WC cart from it and redirect to checkout, so every
 * WooCommerce payment gateway (COD, bank transfer, JazzCash, Easypaisa...) works.
 * ---------------------------------------------------------------------- */
add_action(
	'wp_loaded',
	function () {
		if ( empty( $_GET['anashion_cart'] ) || ! function_exists( 'WC' ) || ! WC()->cart ) {
			return;
		}
		$raw   = sanitize_text_field( wp_unslash( $_GET['anashion_cart'] ) );
		$items = array_slice( array_filter( explode( ',', $raw ) ), 0, 50 );
		WC()->cart->empty_cart();
		foreach ( $items as $item ) {
			$parts = explode( ':', $item );
			$id    = absint( $parts[0] ?? 0 );
			$qty   = max( 1, min( 20, absint( $parts[1] ?? 1 ) ) );
			$size  = isset( $parts[2] ) ? sanitize_text_field( rawurldecode( $parts[2] ) ) : '';
			$prod  = $id ? wc_get_product( $id ) : null;
			if ( ! $prod || ! $prod->is_purchasable() ) {
				continue;
			}
			WC()->cart->add_to_cart( $id, $qty, 0, array(), $size ? array( 'anashion_size' => $size ) : array() );
		}
		wp_safe_redirect( wc_get_checkout_url() );
		exit;
	}
);

// Show the chosen size in cart/checkout and save it on the order line.
add_filter(
	'woocommerce_get_item_data',
	function ( $data, $cart_item ) {
		if ( ! empty( $cart_item['anashion_size'] ) ) {
			$data[] = array( 'key' => __( 'Size', 'anashion-headless' ), 'value' => esc_html( $cart_item['anashion_size'] ) );
		}
		return $data;
	},
	10,
	2
);
add_action(
	'woocommerce_checkout_create_order_line_item',
	function ( $line, $cart_key, $values ) {
		if ( ! empty( $values['anashion_size'] ) ) {
			$line->add_meta_data( __( 'Size', 'anashion-headless' ), $values['anashion_size'] );
		}
	},
	10,
	3
);

/* -------------------------------------------------------------------------
 * Instant refresh: tell the storefront which cache tags changed.
 * Tags must match TAGS in frontend/src/lib/wp.ts.
 * ---------------------------------------------------------------------- */
function anashion_revalidate( array $tags ): void {
	$url    = anashion_get( 'frontend_url' );
	$secret = anashion_get( 'revalidate_secret' );
	if ( ! $url || ! $secret ) {
		return;
	}
	wp_remote_post(
		$url . '/api/revalidate',
		array(
			'blocking' => false,
			'timeout'  => 3,
			'headers'  => array(
				'Content-Type'        => 'application/json',
				'x-revalidate-secret' => $secret,
			),
			'body'     => wp_json_encode( array( 'tags' => array_values( array_unique( $tags ) ) ) ),
		)
	);
}

$anashion_products = fn() => anashion_revalidate( array( 'products' ) );
foreach ( array( 'woocommerce_update_product', 'woocommerce_new_product', 'woocommerce_product_set_stock', 'woocommerce_variation_set_stock', 'created_product_cat', 'edited_product_cat', 'delete_product_cat' ) as $hook ) {
	add_action( $hook, $anashion_products );
}
add_action(
	'trashed_post',
	function ( $post_id ) {
		if ( 'product' === get_post_type( $post_id ) ) {
			anashion_revalidate( array( 'products' ) );
		}
	}
);

add_action( 'update_option_' . ANASHION_OPTION, fn() => anashion_revalidate( array( 'home' ) ) );
add_action( 'wp_update_nav_menu', fn() => anashion_revalidate( array( 'home' ) ) );
