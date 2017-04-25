! function(e) {
    e(".collection-sidebar") && History.Adapter.bind(window, "statechange", function() {
        History.getState();
        if (!t.isSidebarAjaxClick) {
            t.sidebarParams();
            var i = t.sidebarCreateUrl();
            t.sidebarGetContent(i), t.reActivateSidebar()
        }
        t.isSidebarAjaxClick = !1
    }), window.use_color_swatch && (e(".swatch :radio").change(function() {
        var i = e(this).closest(".swatch").attr("data-option-index"),
            t = e(this).val();
        e(this).closest("form").find(".single-option-selector").eq(i).val(t).trigger("change")
    }), Shopify.optionsMap = {}, Shopify.updateOptionsInSelector = function(i) {
        switch (i) {
            case 0:
                var t = "root",
                    a = e(".single-option-selector:eq(0)");
                break;
            case 1:
                var t = e(".single-option-selector:eq(0)").val(),
                    a = e(".single-option-selector:eq(1)");
                break;
            case 2:
                var t = e(".single-option-selector:eq(0)").val();
                t += " / " + e(".single-option-selector:eq(1)").val();
                var a = e(".single-option-selector:eq(2)")
        }
        var o = a.val();
        a.empty();
        var n = Shopify.optionsMap[t];
        if (n && n.length) {
          for (var r = 0; r < n.length; r++) {
              var s = n[r],
                  l = e("<option></option>").val(s).html(s);
              a.append(l)
          }
          e('.swatch[data-option-index="' + i + '"] .swatch-element').each(function() {
              -1 !== e.inArray(e(this).attr("data-value"), n) ? e(this).removeClass("soldout").show().find(":radio").removeAttr("disabled", "disabled").removeAttr("checked") : e(this).addClass("soldout").hide().find(":radio").removeAttr("checked").attr("disabled", "disabled")
          }), -1 !== e.inArray(o, n) && a.val(o), a.trigger("change")
        }
    }, Shopify.linkOptionSelectors = function(i) {
        for (var t = 0; t < i.variants.length; t++) {
            var a = i.variants[t];
            if (a.available) {
                if (Shopify.optionsMap.root = Shopify.optionsMap.root || [], Shopify.optionsMap.root.push(a.option1), Shopify.optionsMap.root = Shopify.uniq(Shopify.optionsMap.root), i.options.length > 1) {
                    var o = a.option1;
                    Shopify.optionsMap[o] = Shopify.optionsMap[o] || [], Shopify.optionsMap[o].push(a.option2), Shopify.optionsMap[o] = Shopify.uniq(Shopify.optionsMap[o])
                }
                if (3 === i.options.length) {
                    var o = a.option1 + " / " + a.option2;
                    Shopify.optionsMap[o] = Shopify.optionsMap[o] || [], Shopify.optionsMap[o].push(a.option3), Shopify.optionsMap[o] = Shopify.uniq(Shopify.optionsMap[o])
                }
            }
        }
        Shopify.updateOptionsInSelector(0), i.options.length > 1 && Shopify.updateOptionsInSelector(1), 3 === i.options.length && Shopify.updateOptionsInSelector(2), e(".single-option-selector:eq(0)").change(function() {
            return Shopify.updateOptionsInSelector(1), 3 === i.options.length && Shopify.updateOptionsInSelector(2), !0
        }), e(".single-option-selector:eq(1)").change(function() {
            return 3 === i.options.length && Shopify.updateOptionsInSelector(2), !0
        })
    }), e(document).ready(function() {
        t.init()
    }), e(window).resize(function() {
        t.initMobileMenu(), t.initResizeImage()
    }), e(window).scroll(function() {
        e(this).scrollTop() > 200 ? e("#back-top").fadeIn() : e("#back-top").fadeOut()
    }), e(".header-mobile").is(":visible") || e(document).on("click touchstart", function(i) {
        var a = e(".quick-view"),
            o = e("#dropdown-cart"),
            n = e("#cartToggle"),
            r = e("#email-modal .modal-window"),
            s = e(".nav-search");
        a.is(i.target) || 0 !== a.has(i.target).length || o.is(i.target) || 0 !== o.has(i.target).length || n.is(i.target) || 0 !== n.has(i.target).length || r.is(i.target) || 0 !== r.has(i.target).length || s.is(i.target) || 0 !== s.has(i.target).length || (t.closeQuickViewPopup(), t.closeDropdownCart(), t.closeEmailModalWindow(), t.closeDropdownSearch())
    }), e(document).keyup(function(i) {
        27 == i.keyCode && (t.closeQuickViewPopup(), t.closeDropdownCart(), t.closeDropdownSearch(), clearTimeout(t.ellaTimeout), e(".modal").is(":visible") && e(".modal").fadeOut(500))
    });
    var t = {
        ellaTimeout: null,
        isSidebarAjaxClick: !1,
        init: function() {
            this.initColorSwatchGrid(), this.initResizeImage(), this.initMobileMenu(), this.initSidebar(), this.initMobileSidebar(), this.initScrollTop(), this.initQuickView(), this.initCloudzoom(), this.initProductMoreview(), this.initAddToCart(), this.initModal(), this.initProductAddToCart(), this.initDropDownCart(), this.initDropdownSearch(), this.initToggleCollectionPanel(), this.initWishlist(), this.initProductWishlist(), this.initRemoveWishlist(), this.initInfiniteScrolling()
        },
        sidebarMapTagEvents: function() {
            e(".sidebar-tag a, .sidebar-tag label").click(function(i) {
                var a = [];
                if (Shopify.queryParams.constraint && (a = Shopify.queryParams.constraint.split("+")), !window.enable_sidebar_multiple_choice && !e(this).prev().is(":checked")) {
                    var o = e(this).parents(".sidebar-tag").find("input:checked");
                    if (o.length > 0) {
                        var n = o.val();
                        if (n) {
                            var r = a.indexOf(n);
                            r >= 0 && a.splice(r, 1)
                        }
                    }
                }
                var n = e(this).prev().val();
                if (n) {
                    var r = a.indexOf(n);
                    r >= 0 ? a.splice(r, 1) : a.push(n)
                }
                a.length ? Shopify.queryParams.constraint = a.join("+") : delete Shopify.queryParams.constraint, t.sidebarAjaxClick(), i.preventDefault()
            })
        },
        sidebarMapCategories: function() {
            e(".sidebar-links a").click(function(i) {
                e(this).hasClass("active") || (delete Shopify.queryParams.q, t.sidebarAjaxClick(e(this).attr("href")), e(".sidebar-links a.active").removeClass("active"), e(this).addClass("active")), i.preventDefault()
            })
        },
        sidebarMapView: function() {
            e(".view-mode a").click(function(i) {
                if (!e(this).hasClass("active")) {
                    var a = e(".filter-show > button span").text();
                    Shopify.queryParams.view = e(this).hasClass("list") ? "list" + a : a, t.sidebarAjaxClick(), e(".view-mode a.active").removeClass("active"), e(this).addClass("active")
                }
                i.preventDefault()
            })
        },
        sidebarMapShow: function() {
            e(".filter-show a").click(function(i) {
                if (!e(this).parent().hasClass("active")) {
                    var a = e(this).attr("href"),
                        o = e(".view-mode a.active").attr("href");
                    Shopify.queryParams.view = "list" == o ? "list" + a : a, t.sidebarAjaxClick(), e(".filter-show > button span").text(a), e(".filter-show li.active").removeClass("active"), e(this).parent().addClass("active")
                }
                i.preventDefault()
            })
        },
        sidebarInitToggle: function() {
            e(".sidebar-tag").length > 0 && e(".sidebar-tag .widget-title span").click(function() {
                var i = e(this).parents(".widget-title");
                i.hasClass("click") ? i.removeClass("click") : i.addClass("click"), e(this).parents(".sidebar-tag").find(".widget-content").slideToggle()
            })
        },
        sidebarMapSorting: function() {
            e(".filter-sortby a").click(function(i) {
                if (!e(this).parent().hasClass("active")) {
                    Shopify.queryParams.sort_by = e(this).attr("href"), t.sidebarAjaxClick();
                    var a = e(this).text();
                    e(".filter-sortby > button span").text(a), e(".filter-sortby li.active").removeClass("active"), e(this).parent().addClass("active")
                }
                i.preventDefault()
            })
        },
        sidebarMapPaging: function() {
            e(".pagination-page a").click(function(i) {
                var a = e(this).attr("href").match(/page=\d+/g);
                if (a && (Shopify.queryParams.page = parseInt(a[0].match(/\d+/g)), Shopify.queryParams.page)) {
                    var o = t.sidebarCreateUrl();
                    t.isSidebarAjaxClick = !0, History.pushState({
                        param: Shopify.queryParams
                    }, o, o), t.sidebarGetContent(o), e("body,html").animate({
                        scrollTop: 500
                    }, 600)
                }
                i.preventDefault()
            })
        },
        sidebarMapClearAll: function() {
            e(".refined-widgets a.clear-all").click(function(i) {
                delete Shopify.queryParams.constraint, delete Shopify.queryParams.q, t.sidebarAjaxClick(), i.preventDefault()
            })
        },
        sidebarMapClear: function() {
            e(".sidebar-tag").each(function() {
                var i = e(this);
                i.find("input:checked").length > 0 && i.find(".clear").show().click(function(a) {
                    var o = [];
                    Shopify.queryParams.constraint && (o = Shopify.queryParams.constraint.split("+")), i.find("input:checked").each(function() {
                        var i = e(this),
                            t = i.val();
                        if (t) {
                            var a = o.indexOf(t);
                            a >= 0 && o.splice(a, 1)
                        }
                    }), o.length ? Shopify.queryParams.constraint = o.join("+") : delete Shopify.queryParams.constraint, t.sidebarAjaxClick(), a.preventDefault()
                })
            })
        },
        sidebarMapEvents: function() {
            t.sidebarMapTagEvents(), t.sidebarMapCategories(), t.sidebarMapView(), t.sidebarMapShow(), t.sidebarMapSorting()
        },
        reActivateSidebar: function() {
            e(".sidebar-custom .active, .sidebar-links .active").removeClass("active"), e(".sidebar-tag input:checked").attr("checked", !1);
            var i = location.pathname.match(/\/collections\/(.*)(\?)?/);
            if (i && i[1] && e(".sidebar-links a[href='" + i[0] + "']").addClass("active"), Shopify.queryParams.view) {
                e(".view-mode .active").removeClass("active");
                var a = Shopify.queryParams.view;
                a.indexOf("list") >= 0 ? (e(".view-mode .list").addClass("active"), a = a.replace("list", "")) : e(".view-mode .grid").addClass("active"), e(".filter-show > button span").text(a), e(".filter-show li.active").removeClass("active"), e(".filter-show a[href='" + a + "']").parent().addClass("active")
            }
            t.initSortby()
        },
        initSortby: function() {
            if (Shopify.queryParams.sort_by) {
                var i = Shopify.queryParams.sort_by,
                    t = e(".filter-sortby a[href='" + i + "']").text();
                e(".filter-sortby > button span").text(t), e(".filter-sortby li.active").removeClass("active"), e(".filter-sortby a[href='" + i + "']").parent().addClass("active")
            }
        },
        sidebarMapData: function(i) {
            var a = e(".col-main .products-grid");
            0 == a.length && (a = e(".col-main .product-list"));
            var o = e(i).find(".col-main .products-grid");
            0 == o.length && (o = e(i).find(".col-main .product-list")), o.length > 0 && o.hasClass("products-grid") && window.product_image_resize && o.find("img").fakecrop({
                fill: window.images_size.is_crop,
                widthSelector: ".products-grid .grid-item .product-image",
                ratioWrapper: window.images_size
            }), a.replaceWith(o), t.checkNeedToConvertCurrency() && Currency.convertAll(window.shop_currency, jQuery("#currencies").val(), ".col-main span.money", "money_format"), e(".padding").length > 0 ? e(".padding").replaceWith(e(i).find(".padding")) : e(".block-row.col-main").append(e(i).find(".padding"));
            var n = e(".page-header"),
                r = e(i).find(".page-header");
            n.find("h2").text() != r.find("h2").text() && (n.find("h2").replaceWith(r.find("h2")), n.find(".rte").length ? r.find(".rte").length ? n.find(".rte").replaceWith(r.find(".rte")) : n.find(".rte").hide() : r.find(".rte").length && n.find("h2").after(r.find(".rte"))), e(".refined-widgets").replaceWith(e(i).find(".refined-widgets")), e(".sidebar-block").replaceWith(e(i).find(".sidebar-block"));

            t.initColorSwatchGrid();

            //product review
            if ($(".spr-badge").length > 0) {
                return window.SPR.registerCallbacks(), window.SPR.initRatingHandler(), window.SPR.initDomEls(), window.SPR.loadProducts(), window.SPR.loadBadges();
            }
        },
        sidebarCreateUrl: function(i) {
            var t = e.param(Shopify.queryParams).replace(/%2B/g, "+");
            return i ? "" != t ? i + "?" + t : i : location.pathname + "?" + t
        },
        sidebarAjaxClick: function(i) {
            delete Shopify.queryParams.page;
            var e = t.sidebarCreateUrl(i);
            t.isSidebarAjaxClick = !0, History.pushState({
                param: Shopify.queryParams
            }, e, e), t.sidebarGetContent(e)
        },
        sidebarGetContent: function(i) {
            e.ajax({
                type: "get",
                url: i,
                beforeSend: function() {
                    t.showLoading()
                },
                success: function(i) {
                    t.sidebarMapData(i), t.sidebarMapPaging(), t.sidebarMapTagEvents(), t.sidebarInitToggle(), t.sidebarMapClear(), t.sidebarMapClearAll(), t.hideLoading(), t.initQuickView(), t.initAddToCart(), t.initWishlist();
                    // Hide sidebar on mobile
                    if (e("#displayTextLeft").is(':visible')) {
                        e("#displayTextLeft").trigger( "click" );
                    }
                },
                error: function(i) {
                    t.hideLoading(), e(".loading-modal").hide(), e(".ajax-error-message").text(e.parseJSON(i.responseText).description), t.showModal(".ajax-error-modal")
                }
            })
        },
        sidebarParams: function() {
            if (Shopify.queryParams = {}, location.search.length)
                for (var i, e = 0, t = location.search.substr(1).split("&"); e < t.length; e++) i = t[e].split("="), i.length > 1 && (Shopify.queryParams[decodeURIComponent(i[0])] = decodeURIComponent(i[1]))
        },
        initMobileSidebar: function() {
            e("footer").append("<a class='option-sidebar left' id='displayTextLeft' href='javascript:void(0)' title='Show Sidebar'><span>Show Sidebar</span></a>"), e("#displayTextLeft").click(function(i) {
                i.preventDefault(), e(".sidebar").is(":hidden") ? (e(".sidebar").fadeIn(800), e("body,html").animate({
                    scrollTop: 400
                }, 600), e("#displayTextLeft").toggleClass("hidden-arrow-left"), e("#displayTextLeft").attr("title", "hide-sidebar"), e("#displayTextLeft").html("<span>Hide Sidebar</span>")) : (e(".sidebar").fadeOut(800), e("#displayTextLeft").removeClass("hidden-arrow-left"), e("#displayTextLeft").attr("title", "show-sidebar"), e("#displayTextLeft").html("<span>Show Sidebar</span>"))
            })
        },
        initSidebar: function() {
            e(".collection-sidebar").length > 0 && (t.sidebarParams(), t.initSortby(), t.sidebarMapEvents(), t.sidebarMapPaging(), t.sidebarInitToggle(), t.sidebarMapClear(), t.sidebarMapClearAll())
        },
        initMobileMenu: function() {
            e(".menu-block").is(":visible") ? (e(".gf-menu-device-container ul.gf-menu li.dropdown").each(function() {
                0 == e(this).find("> p.toogleClick").length && e(this).prepend('<p class="toogleClick">+</p>')
            }), 0 == e(".menu-block").children().hasClass("gf-menu-device-wrapper") && e(".menu-block").children().addClass("gf-menu-device-wrapper"), 0 == e(".gf-menu-device-container").find("ul.gf-menu").size() && (e(".gf-menu-device-container").append(e(".nav-bar .container").html()), e(".gf-menu-device-container .site-nav").addClass("gf-menu"), e(".gf-menu-device-container .site-nav").removeClass("nav")), e("p.toogleClick").click(function() {
                e(this).hasClass("mobile-toggle-open") ? (e(this).next().next().hide(), e(this).removeClass("mobile-toggle-open")) : (e(this).next().next().show(), e(this).addClass("mobile-toggle-open"))
            }), e("p.toogleClick").show(), e("div.gf-menu-toggle").hide(), e(".nav-bar .container").hide(), 0 == e("ul.gf-menu").hasClass("clicked") && (e(".gf-menu").hide(), e(".gf-menu li.dropdown ul.site-nav-dropdown").hide()), e(".col-1 .inner ul.dropdown").parent().each(function() {
                0 == e(this).find("> p.toogleClick").length && e(this).prepend('<p class="toogleClick">+</p>')
            }), e(".cbp-spmenu span.icon-dropdown").remove(), e("ul.gf-menu li.dropdown").each(function() {
                0 == e(this).find("> p.toogleClick").length && e(this).prepend('<p class="toogleClick">+</p>')
            }), e("p.toogleClick").click(function() {
                e(this).hasClass("mobile-toggle-open") ? (e(this).next().next().hide(), e(this).removeClass("mobile-toggle-open")) : (e(this).next().next().show(), e(this).addClass("mobile-toggle-open"))
            }), e(".header-panel-bottom ul.customer-links").prependTo(e(".customer-area .dropdown-menu"))) : (e(".nav-bar .container").show(), e(".gf-menu").hide(), e(".customer-area ul.customer-links").appendTo(e(".header-panel-bottom")).after(e(".top-header"))), 0 == e(".menu-block").children().hasClass("gf-menu-device-wrapper") && e(".menu-block").children().addClass("resized")
        },
        initWishlist: function() {
            e(".grid-item button.wishlist").click(function(i) {
                i.preventDefault();
                var a = e(this).parent(),
                    o = a.parents(".grid-item");
                e.ajax({
                    type: "POST",
                    url: "/contact",
                    data: a.serialize(),
                    beforeSend: function() {
                        t.showLoading()
                    },
                    success: function() {
                        t.hideLoading(), a.html('<a class="wishlist" href="/pages/wish-list" title="Go to wishlist"><span class="icon"></span><span>Go to wishlist</span></a>');
                        var i = o.find(".product-title").text(),
                            n = o.find("a > img").attr("src");
                        e(".ajax-success-modal").find(".ajax-product-title").text(i), e(".ajax-success-modal").find(".ajax-product-image").attr("src", n), e(".ajax-success-modal").find(".btn-go-to-wishlist").show(), e(".ajax-success-modal").find(".btn-go-to-cart").hide(), t.showModal(".ajax-success-modal")
                    },
                    error: function(i) {
                        t.hideLoading(), e(".loading-modal").hide(), e(".ajax-error-message").text(e.parseJSON(i.responseText).description), t.showModal(".ajax-error-modal")
                    }
                })
            })
        },
        initProductWishlist: function() {
            e(".product button.wishlist").click(function(i) {
                i.preventDefault(); {
                    var a = e(this).parent();
                    a.parents(".grid-item")
                }
                e.ajax({
                    type: "POST",
                    url: "/contact",
                    data: a.serialize(),
                    beforeSend: function() {
                        t.showLoading()
                    },
                    success: function() {
                        t.hideLoading(), a.html('<a class="wishlist" href="/pages/wish-list" title="Go to wishlist"><span class="icon"></span><span>Go to wishlist</span></a>');
                        var i = e(".product-title h2").text(),
                            o = e("#product-featured-image").attr("src");
                        e(".ajax-success-modal").find(".ajax-product-title").text(i), e(".ajax-success-modal").find(".ajax-product-image").attr("src", o), e(".ajax-success-modal").find(".btn-go-to-wishlist").show(), e(".ajax-success-modal").find(".btn-go-to-cart").hide(), t.showModal(".ajax-success-modal")
                    },
                    error: function(i) {
                        t.hideLoading(), e(".loading-modal").hide(), e(".ajax-error-message").text(e.parseJSON(i.responseText).description), t.showModal(".ajax-error-modal")
                    }
                })
            })
        },
        initRemoveWishlist: function() {
            e(".btn-remove-wishlist").click(function() {
                var i = e(this).parents("tr"),
                    a = i.find(".tag-id").val(),
                    o = jQuery("#remove-wishlist-form");
                o.find("input[name='contact[tags]']").val("x" + a), e.ajax({
                    type: "POST",
                    url: "/contact",
                    data: o.serialize(),
                    beforeSend: function() {
                        t.showLoading()
                    },
                    success: function() {
                        t.hideLoading(), i.fadeOut(1e3)
                    },
                    error: function(i) {
                        t.hideLoading(), e(".loading-modal").hide(), e(".ajax-error-message").text(e.parseJSON(i.responseText).description), t.showModal(".ajax-error-modal")
                    }
                })
            })
        },
        initColorSwatchGrid: function() {
          jQuery('.item-swatch li label').hover(function(){
            var newImage = jQuery(this).parent().find('.hidden a').attr('href');
            jQuery(this).parents('.grid-item').find('.product-grid-image img').attr({ src: newImage });
            return false;
          });
        },
        initResizeImage: function() {
            window.product_image_resize && e(".products-grid .product-image img").fakecrop({
                fill: window.images_size.is_crop,
                widthSelector: ".products-grid .grid-item .product-image",
                ratioWrapper: window.images_size
            })
        },
        initInfiniteScrolling: function() {
            e(".infinite-scrolling").length > 0 && e(".infinite-scrolling a").click(function(i) {
                i.preventDefault(), e(this).hasClass("disabled") || t.doInfiniteScrolling()
            })
        },
        doInfiniteScrolling: function() {
            var currentList = $('.block-row .products-grid');
            if (!currentList.length) {
                currentList = $('.block-row .product-list');
            }
            if (currentList) {
                var showMoreButton = $('.infinite-scrolling a').first();
                $.ajax({
                    type: 'GET',
                    url: showMoreButton.attr("href"),
                    beforeSend: function() {
                        t.showLoading();
                        $('.loading-modal').show();
                    },
                    success: function(data) {
                        t.hideLoading();
                        var products = $(data).find(".block-row .products-grid");
                        if (!products.length) {
                            products = $(data).find(".block-row .product-list");
                        }
                        if (products.length) {
                            if (products.hasClass('products-grid')) {
                                /*fake crop*/
                                if (window.product_image_resize) {
                                    products.children().find('img').fakecrop({
                                        fill: window.images_size.is_crop,
                                        widthSelector: ".products-grid .grid-item .product-image",
                                        ratioWrapper: window.images_size
                                    });
                                }
                            }

                            currentList.append(products.children());
                            t.initQuickView();
                            t.initAddToCart();
                            t.initWishlist();
                            //get link of Show more
                            if ($(data).find('.infinite-scrolling').length > 0) {
                                showMoreButton.attr('href', $(data).find('.infinite-scrolling a').attr('href'));
                            } else {
                                //no more products
                                showMoreButton.hide();
                                showMoreButton.next().show();
                            }

                          	//currency
                            if (window.show_multiple_currencies && window.shop_currency != jQuery("#currencies").val())
                            {
                                Currency.convertAll(window.shop_currency, jQuery("#currencies").val(), "span.money", "money_format")
                            }

                            t.initColorSwatchGrid();

                            //product review
                            if ($(".spr-badge").length > 0) {
                                return window.SPR.registerCallbacks(), window.SPR.initRatingHandler(), window.SPR.initDomEls(), window.SPR.loadProducts(), window.SPR.loadBadges();
                            }
                        }
                    },
                    error: function(xhr, text) {
                        t.hideLoading();
                        $('.loading-modal').hide();
                        $('.ajax-error-message').text($.parseJSON(xhr.responseText).description);
                        t.showModal('.ajax-error-modal');
                    },
                    dataType: "html"
                });
            }
        },
        closeEmailModalWindow: function() {
            e("#email-modal").length > 0 && e("#email-modal").is(":visible") && e("#email-modal .modal-window").fadeOut(600, function() {
                e("#email-modal .modal-overlay").fadeOut(600, function() {
                    e("#email-modal").hide(), e.cookie("emailSubcribeModal", "closed", {
                        expires: 1,
                        path: "/"
                    })
                })
            })
        },
        showModal: function(i) {
            e(i).fadeIn(500), t.ellaTimeout = setTimeout(function() {
                e(i).fadeOut(500)
            }, 5e3)
        },
        initToggleCollectionPanel: function() {
            e(".collection-sharing-btn").length > 0 && e(".collection-sharing-btn").click(function() {
                e(".collection-sharing-panel").toggle(), e(".collection-sharing-panel").is(":visible") ? (e(".collection-sharing-btn").addClass("btn-hover"), e(".collection-filter-panel").hide(), e(".collection-filter-btn").removeClass("btn-hover")) : e(".collection-sharing-btn").removeClass("btn-hover")
            }), e(".collection-filter-btn").length > 0 && (e(".collection-filter-btn").click(function() {
                e(".collection-filter-panel").toggle(), e(".collection-filter-panel").is(":visible") ? (e(".collection-filter-btn").addClass("btn-hover"), e(".collection-sharing-panel").hide(), e(".collection-sharing-btn").removeClass("btn-hover")) : e(".collection-filter-btn").removeClass("btn-hover")
            }), e(".collection-filter-panel select").change(function() {
                window.location = e(this).find("option:selected").val()
            }))
        },
        checkItemsInDropdownCart: function() {
            e("#dropdown-cart .mini-products-list").children().length > 0 ? (e("#dropdown-cart .no-items").hide(), e("#dropdown-cart .has-items").show()) : (e("#dropdown-cart .has-items").hide(), e("#dropdown-cart .no-items").show())
        },
        initModal: function() {
            e(".continue-shopping").click(function() {
                clearTimeout(t.ellaTimeout), e(".ajax-success-modal").fadeOut(500)
            }), e(".close-modal, .overlay").click(function() {
                clearTimeout(t.ellaTimeout), e(".ajax-success-modal").fadeOut(500)
            })
        },
        initDropDownCart: function() {
            "click" == window.dropdowncart_type ? e("#cartToggle").click(function() {
                e("#dropdown-cart").is(":visible") ? e("#dropdown-cart").slideUp("fast") : e("#dropdown-cart").slideDown("fast")
            }) : "ontouchstart" in document ? e("#cartToggle").click(function() {
                e("#dropdown-cart").is(":visible") ? e("#dropdown-cart").slideUp("fast") : e("#dropdown-cart").slideDown("fast")
            }) : (e("#cartToggle").hover(function() {
                e("#dropdown-cart").is(":visible") || e("#dropdown-cart").slideDown("fast")
            }), e(".wrapper-top-cart").mouseleave(function() {
                e("#dropdown-cart").slideUp("fast")
            })), t.checkItemsInDropdownCart(), e("#dropdown-cart .no-items a").click(function() {
                e("#dropdown-cart").slideUp("fast")
            }), e("#dropdown-cart .btn-remove").click(function(i) {
                i.preventDefault();
                var a = e(this).parents(".item").attr("id");
                a = a.match(/\d+/g), Shopify.removeItem(a, function(i) {
                    t.doUpdateDropdownCart(i)
                })
            })
        },
        closeDropdownCart: function() {
            e("#dropdown-cart").is(":visible") && e("#dropdown-cart").slideUp("fast")
        },
        initDropdownSearch: function() {
            e(".nav-search .icon-search").click(function() {
                e(".header-bottom.on .search-bar").is(":visible") ? e(".header-bottom.on .search-bar").slideUp("fast") : e(".header-bottom.on .search-bar").slideDown("fast")
            })
        },
        closeDropdownSearch: function() {
            e(".header-bottom.on .search-bar").is(":visible") && e(".header-bottom.on .search-bar").slideUp("fast")
        },
        initProductMoreview: function() {
            e(".more-view-wrapper-owlslider").length > 0 ? this.initOwlMoreview() : e(".more-view-wrapper-jcarousel").length > 0 && this.initJcarouselMoreview()
        },
        initOwlMoreview: function() {
            e(".more-view-wrapper-owlslider ul").owlCarousel({
                navigation: !0,
                items: 5,
                itemsDesktop: [1199, 4],
                itemsDesktopSmall: [979, 3],
                itemsTablet: [768, 3],
                itemsTabletSmall: [540, 3],
                itemsMobile: [360, 3]
            }).css("visibility", "visible")
        },
        initJcarouselMoreview: function() {
            e(".more-view-wrapper-jcarousel ul").jcarousel({
                vertical: !0
            }).css("visibility", "visible"), e(".product-img-box").addClass("has-jcarousel"), e(".more-view-wrapper").css("visibility", "visible")
        },
        initCloudzoom: function() {
            e("#product-featured-image").length > 0 && (e(".visible-phone").is(":visible") ? (e("#product-featured-image").elevateZoom({
                gallery: "more-view-carousel",
                cursor: "pointer",
                galleryActiveClass: "active",
                imageCrossfade: !1,
                scrollZoom: !1,
                onImageSwapComplete: function() {
                    e(".zoomWrapper div").hide()
                },
                loadingIcon: window.loading_url
            }), e("#product-featured-image").bind("click", function() {
                return !1
            })) : (e("#product-featured-image").elevateZoom({
                gallery: "more-view-carousel",
                cursor: "pointer",
                galleryActiveClass: "active",
                imageCrossfade: !0,
                scrollZoom: !0,
                onImageSwapComplete: function() {
                    e(".zoomWrapper div").hide()
                },
                loadingIcon: window.loading_url
            }), e("#product-featured-image").bind("click", function() {
                var i = e("#product-featured-image").data("elevateZoom");
                return e.fancybox(i.getGalleryList()), !1
            })))
        },
        initScrollTop: function() {
            e("#back-top").click(function() {
                return e("body,html").animate({
                    scrollTop: 0
                }, 400), !1
            })
        },
        initProductAddToCart: function() {
            e("#product-add-to-cart").length > 0 && e("#product-add-to-cart").click(function(i) {
                if (i.preventDefault(), "disabled" != e(this).attr("disabled"))
                    if (window.ajax_cart) {
                        var a = e("#add-to-cart-form select[name=id]").val();
                        a || (a = e("#add-to-cart-form input[name=id]").val());
                        var o = e("#add-to-cart-form select[name=quantity]").val();
                        o || (o = 1);
                        var n = e(".product-title h2").text(),
                            r = e("#product-featured-image").attr("src");
                        t.doAjaxAddToCart(a, o, n, r)
                    } else e(this).closest("form").submit();
                return !1
            })
        },
        initAddToCart: function() {
            e(".add-to-cart-btn").length > 0 && e(".add-to-cart-btn").click(function(i) {
                if (i.preventDefault(), "disabled" != e(this).attr("disabled")) {
                    var a = e(this).parents(".product-item"),
                        o = e(a).attr("id");
                    if (o = o.match(/\d+/g), window.ajax_cart) {
                        var n = e("#product-actions-" + o + " select[name=id]").val();
                        n || (n = e("#product-actions-" + o + " input[name=id]").val());
                        var r = e("#product-actions-" + o + " input[name=quantity]").val();
                        r || (r = 1);
                        var s = e(a).find(".product-title").text(),
                            l = e(a).find(".product-grid-image img").attr("src");
                        t.doAjaxAddToCart(n, r, s, l)
                    } else e("#product-actions-" + o).submit()
                }
                return !1
            })
        },
        showLoading: function() {
            e(".loading-modal").show()
        },
        hideLoading: function() {
            e(".loading-modal").hide()
        },
      doAjaxAddToCart: function(i, a, o, n) {
        e.ajax({
          type: "post",
          url: "/cart/add.js",
          data: "quantity=" + a + "&id=" + i,
          dataType: "json",
          beforeSend: function() {
            t.showLoading()
          },
          success: function() {
            t.hideLoading(), e(".ajax-success-modal").find(".ajax-product-title").text(o), e(".ajax-success-modal").find(".ajax-product-image").attr("src", n), e(".ajax-success-modal").find(".btn-go-to-wishlist").hide(), e(".ajax-success-modal").find(".btn-go-to-cart").show(), t.showModal(".ajax-success-modal"), t.updateDropdownCart()                    
            if (typeof(upsell_main) === "function") {
              upsell_main();
            }
            if (typeof(upsell_offer) === "function") { 
              upsell_offer(); 
              jQuery('#giveacceptbtn,#giveclosebtn,.close_image,#facebox_overlay').on('click', function(){ 
                /* Original success code here - triggers when the upsell pop-up is closed */ 
              });
            } else { 
              /*Original success code here*/
            }
          },
          error: function(i) {
            t.hideLoading(), e(".ajax-error-message").text(e.parseJSON(i.responseText).description), t.showModal(".ajax-error-modal")
          }
        })
      },
        initQuickView: function() {
            e(".quickview-button a").click(function() {
                var i = e(this).attr("id");
                var split_id = i.split("?view=");

                return BOLD.helpers.getProduct(split_id[0], function(i) {
                    var a = e("#quickview-template").html();
                    e(".quick-view").html(a);
                    var o = e(".quick-view");
                    if (o.find(".product-title a").text(i.title), o.find(".product-title a").attr("href", i.url + "?view=" + split_id[1]), o.find(".product-vendor span").length > 0 && o.find(".product-vendor span").text(i.vendor), o.find(".product-type span").length > 0 && o.find(".product-type span").text(i.type), o.find(".product-inventory span").length > 0) {
                        var n = i.variants[0].inventory_quantity;
                        o.find(".product-inventory span").text(n > 0 ? null != i.variants[0].inventory_management ? n + " in stock" : "Many in stock" : "Out of stock")
                    }
                    if (i.description.indexOf("[countdown]") > 0) {
                        var r = i.description.match(/\[countdown\](.*)\[\/countdown\]/);
                        r && r.length > 0 && (o.find(".countdown").show(), o.find(".quickview-clock").countdown(r[1], function(i) {
                            e(this).html(i.strftime("%Dd %H:%M:%S"))
                        }))
                    }
                    if (o.find(".product-description").length > 0) {
                        var s = i.description.replace(/(<([^>]+)>)/gi, ""),
                            s = s.replace(/\[countdown\](.*)\[\/countdown\]/g, "");
                        s = s.split(" ").splice(0, 20).join(" ") + "...", o.find(".product-description").text(s)
                    } else o.find(".product-description").remove();
                    o.find(".price").html(Shopify.formatMoney(i.price, window.money_format)), o.find(".product-item").attr("id", "product-" + i.id), o.find(".variants").attr("id", "product-actions-" + i.id), o.find(".variants select").attr("id", "product-select-" + i.id), i.compare_at_price > i.price ? (o.find(".compare-price").html(Shopify.formatMoney(i.compare_at_price_max, window.money_format)).show(), o.find(".price").addClass("on-sale")) : (o.find(".compare-price").html(""), o.find(".price").removeClass("on-sale")), i.available ? (o.find(".total-price span").html(Shopify.formatMoney(i.price, window.money_format)), window.use_color_swatch ? t.createQuickViewVariantsSwatch(i, o) : t.createQuickViewVariants(i, o)) : (o.find("select, input, .total-price, .dec, .inc, .variants label").remove(), o.find(".add-to-cart-btn").text("Unavailable").addClass("disabled").attr("disabled", "disabled")), o.find(".button").on("click", function() {
                        var i = o.find(".quantity").val(),
                            a = 1;
                        "+" == e(this).text() ? a = parseInt(i) + 1 : i > 1 && (a = parseInt(i) - 1), o.find(".quantity").val(a), o.find(".total-price").length > 0 && t.updatePricingQuickview()
                    }), window.show_multiple_currencies && Currency.convertAll(window.shop_currency, jQuery("#currencies").val(), "span.money", "money_format"), t.loadQuickViewSlider(i, o), t.initQuickviewAddToCart(), e(".quick-view").fadeIn(500), e(".quick-view .total-price").length > 0 && e(".quick-view input[name=quantity]").on("change", t.updatePricingQuickview)
                }), !1
            }), e(".quick-view .overlay, .close-window").live("click", function() {
                return t.closeQuickViewPopup(), !1
            })
        },
        updatePricingQuickview: function() {
            var i = /([0-9]+[.|,][0-9]+[.|,][0-9]+)/g,
                t = e(".quick-view .price").text().match(i);
            if (t || (i = /([0-9]+[.|,][0-9]+)/g, t = e(".quick-view .price").text().match(i)), t) {
                var a = t[0],
                    o = a.replace(/[.|,]/g, ""),
                    n = parseInt(e(".quick-view input[name=quantity]").val()),
                    r = o * n,
                    s = Shopify.formatMoney(r, window.money_format);
                s = s.match(i)[0];
                var l = new RegExp(a, "g"),
                    c = e(".quick-view .price").html().replace(l, s);
                e(".quick-view .total-price span").html(c)
            }
        },
        initQuickviewAddToCart: function() {
            e(".quick-view .add-to-cart-btn").length > 0 && e(".quick-view .add-to-cart-btn").click(function() {
                var i = e(".quick-view select[name=id]").val();
                i || (i = e(".quick-view input[name=id]").val());
                var a = e(".quick-view input[name=quantity]").val();
                a || (a = 1);
                var o = e(".quick-view .product-title a").text(),
                    n = e(".quick-view .quickview-featured-image img").attr("src");
                t.doAjaxAddToCart(i, a, o, n), t.closeQuickViewPopup()
            })
        },
        updateDropdownCart: function() {
            Shopify.getCart(function(i) {
                t.doUpdateDropdownCart(i)
            })
        },
        doUpdateDropdownCart: function(i) {
            var a = '<li class="item" id="cart-item-{ID}"><a href="{URL}" title="{TITLE}" class="product-image"><img src="{IMAGE}" alt="{TITLE}"></a><div class="product-details"><a href="javascript:void(0)" title="Remove This Item" class="btn-remove">X</a><p class="product-name"><a href="{URL}">{TITLE}</a></p><div class="cart-collateral">{QUANTITY} x <span class="price">{PRICE}</span></div></div></li>';
            if (e("#cartCount").text(i.item_count), e("#dropdown-cart .summary .price").html(Shopify.formatMoney(i.total_price, window.money_format)), e("#dropdown-cart .mini-products-list").html(""), i.item_count > 0) {
                for (var o = 0; o < i.items.length; o++) {
                    var n = a;
                    n = n.replace(/\{ID\}/g, i.items[o].id), n = n.replace(/\{URL\}/g, i.items[o].url), n = n.replace(/\{TITLE\}/g, i.items[o].title), n = n.replace(/\{QUANTITY\}/g, i.items[o].quantity), n = n.replace(/\{IMAGE\}/g, Shopify.resizeImage(i.items[o].image, "small")), n = n.replace(/\{PRICE\}/g, Shopify.formatMoney(i.items[o].price, window.money_format)), e("#dropdown-cart .mini-products-list").append(n)
                }
                e("#dropdown-cart .btn-remove").click(function(i) {
                    i.preventDefault();
                    var a = e(this).parents(".item").attr("id");
                    a = a.match(/\d+/g), Shopify.removeItem(a, function(i) {
                        t.doUpdateDropdownCart(i)
                    })
                }), t.checkNeedToConvertCurrency() && Currency.convertAll(window.shop_currency, jQuery("#currencies").val(), "#dropdown-cart span.money", "money_format")
            }
            t.checkItemsInDropdownCart()
        },
        checkNeedToConvertCurrency: function() {
            return window.show_multiple_currencies && Currency.currentCurrency != shopCurrency
        },
        loadQuickViewSlider: function(a, o) {
            var n = Shopify.resizeImage(a.featured_image, "grande");
            if (o.find(".quickview-featured-image").append('<a href="' + a.url + '"><img src="' + n + '" title="' + a.title + '"/><div style="height: 100%; width: 100%; top:0; left:0 z-index: 2000; position: absolute; display: none; background: url(' + window.loading_url + ') 50% 50% no-repeat;"></div></a>'), a.images.length > 1) {
                var r = o.find(".more-view-wrapper ul");
                var count = 0;
                for (i in a.images) {
                    if (count < a.images.length) {
                        var s = Shopify.resizeImage(a.images[i], "grande"),
                            l = Shopify.resizeImage(a.images[i], "compact"),
                            c = '<li><a href="javascript:void(0)" data-image="' + s + '"><img src="' + l + '"  /></a></li>';
                        r.append(c);
                        count = count + 1;
                    }
                }
                r.find("a").click(function() {
                    var i = o.find(".quickview-featured-image img"),
                        t = o.find(".quickview-featured-image div");
                    i.attr("src") != e(this).attr("data-image") && (i.attr("src", e(this).attr("data-image")), t.show(), i.load(function() {
                        t.hide(), e(this).unbind("load"), t.hide()
                    }))
                }), r.hasClass("quickview-more-views-owlslider") ? t.initQuickViewCarousel(r) : t.initQuickViewVerticalMoreview(r)
            } else o.find(".quickview-more-views").remove(), o.find(".quickview-more-view-wrapper-jcarousel").remove()
        },
        initQuickViewCarousel: function(i) {
            i && i.owlCarousel({
                navigation: !0,
                items: 5,
                itemsDesktop: [1199, 4],
                itemsDesktopSmall: [979, 3],
                itemsTablet: [768, 3],
                itemsTabletSmall: [540, 3],
                itemsMobile: [360, 3]
            }).css("visibility", "visible")
        },
        initQuickViewVerticalMoreview: function(i) {
            i && (i.jcarousel({
                vertical: !0
            }), e(".product-img-box").addClass("has-jcarousel"), e(".more-view-wrapper").css("visibility", "visible"))
        },
        convertToSlug: function(i) {
            return i.toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-")
        },
        createQuickViewVariantsSwatch: function(i, t) {
            if (i.variants.length > 1) {
                for (var a = 0; a < i.variants.length; a++) {
                    var o = i.variants[a],
                        n = '<option value="' + o.id + '">' + o.title + "</option>";
                    t.find("form.variants > select").append(n)
                }
                new Shopify.OptionSelectors("product-select-" + i.id, {
                    product: i,
                    onVariantSelected: selectCallbackQuickview
                });
                for (var r = window.file_url.substring(0, window.file_url.lastIndexOf("?")), s = window.asset_url.substring(0, window.asset_url.lastIndexOf("?")), l = "", a = 0; a < i.options.length; a++) {
                    l += '<div class="swatch clearfix" data-option-index="' + a + '">', l += '<div class="header">' + i.options[a].name + "</div>";
                    var c = !1;
                    /Color|Colour/i.test(i.options[a].name) && (c = !0);
                    for (var d = new Array, p = 0; p < i.variants.length; p++) {
                        var o = i.variants[p],
                            u = o.options[a],
                            f = this.convertToSlug(u),
                            h = "swatch-" + a + "-" + f;
                        d.indexOf(u) < 0 && (l += '<div data-value="' + u + '" class="swatch-element ' + (c ? "color" : "") + f + (o.available ? " available " : " soldout ") + '">', c && (l += '<div class="tooltip">' + u + "</div>"), l += '<input id="' + h + '" type="radio" name="option-' + a + '" value="' + u + '" ' + (0 == p ? " checked " : "") + (o.available ? "" : " disabled") + " />", l += c ? '<label for="' + h + '" style="background-color: ' + f + "; background-image: url(" + r + f + '.png)"><img class="crossed-out" src="' + s + 'soldout.png" /></label>' : '<label for="' + h + '">' + u + '<img class="crossed-out" src="' + s + 'soldout.png" /></label>', l += "</div>", o.available && e('.quick-view .swatch[data-option-index="' + a + '"] .' + f).removeClass("soldout").addClass("available").find(":radio").removeAttr("disabled"), d.push(u))
                    }
                    l += "</div>"
                }
                t.find("form.variants > select").after(l), t.find(".swatch :radio").change(function() {
                    var i = e(this).closest(".swatch").attr("data-option-index"),
                        t = e(this).val();
                    e(this).closest("form").find(".single-option-selector").eq(i).val(t).trigger("change")
                }), i.available && (Shopify.optionsMap = {}, Shopify.linkOptionSelectors(i))
            } else {
                t.find("form.variants > select").remove();
                var m = '<input type="hidden" name="id" value="' + i.variants[0].id + '">';
                t.find("form.variants").append(m)
            }
        },
        createQuickViewVariants: function(product, quickviewTemplate) {
            if (product.variants.length > 1) { //multiple variants
                for (var i = 0; i < product.variants.length; i++) {
                    var variant = product.variants[i];
                    var option = '<option value="' + variant.id + '">' + variant.title + '</option>';
                    quickviewTemplate.find('form.variants > select').append(option);
                }

                new Shopify.OptionSelectors("product-select-" + product.id, {
                    product: product,
                    onVariantSelected: selectCallbackQuickview
                });

                if (product.options.length == 1) {
                    $('.selector-wrapper:eq(0)').prepend('<label>' + product.options[0].name + '</label>');
                    for (var text = product.variants, r = 0; r < text.length; r++ ) {
                      var s = text[r];
                      if (!s.available) {
                        jQuery('.single-option-selector option').filter(function() { return jQuery(this).html() === s.title }).remove();
                      }
                    };
                }

                $('.quick-view .single-option-selector').selectize();
                $('.quick-view .selectize-input input').attr("disabled", "disabled");

                quickviewTemplate.find('form.variants .selector-wrapper label').each(function(i, v) {
                    $(this).html(product.options[i].name);
                });
            } else { //single variant
                quickviewTemplate.find('form.variants > select').remove();
                var variant_field = '<input type="hidden" name="id" value="' + product.variants[0].id + '">';
                quickviewTemplate.find('form.variants').append(variant_field);
            }

        },
        closeQuickViewPopup: function() {
            e(".quick-view").fadeOut(500)
        }
    }
}(jQuery);
